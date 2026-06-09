import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";

export interface AuthUser {
  id: string;
  role: "ADMIN" | "CLIENTE";
}

const TOKEN_TTL_SECONDS = 60 * 60 * 8;
const secret = process.env.AUTH_SECRET;

if (process.env.NODE_ENV === "production" && !secret) {
  throw new Error("AUTH_SECRET is required in production.");
}

function authSecret(): string {
  return secret ?? "dev-only-auth-secret-change-me";
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", authSecret()).update(data).digest("base64url");
}

export function createToken(user: AuthUser): string {
  const payload = base64Url(JSON.stringify({
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  }));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): AuthUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      role?: string;
      exp?: number;
    };
    if (!parsed.sub || (parsed.role !== "ADMIN" && parsed.role !== "CLIENTE")) return null;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: parsed.sub, role: parsed.role };
  } catch {
    return null;
  }
}

export function getAuthUser(request: FastifyRequest): AuthUser | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return verifyToken(header.slice("Bearer ".length));
}

export function requireAuth(request: FastifyRequest): AuthUser {
  const user = getAuthUser(request);
  if (!user) {
    throw Object.assign(new Error("No autorizado."), { statusCode: 401 });
  }
  return user;
}

export function requireAdmin(request: FastifyRequest): AuthUser {
  const user = requireAuth(request);
  if (user.role !== "ADMIN") {
    throw Object.assign(new Error("No tienes permisos para esta accion."), { statusCode: 403 });
  }
  return user;
}
