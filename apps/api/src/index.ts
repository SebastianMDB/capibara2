import "dotenv/config";
import cors from "@fastify/cors";
import Fastify, { type FastifyReply } from "fastify";
import type { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { prisma, closeDb } from "./db.js";
import { generateRequestPdf } from "./pdf-generator.js";
import { createToken, requireAdmin, requireAuth } from "./security/auth.js";
import { hashPassword, verifyPassword } from "./security/password.js";
import { publicPaymentSettings, publicRequest, publicService, publicUser } from "./utils/serializers.js";
import {
  createUserSchema,
  loginSchema,
  paymentSettingsSchema,
  requestSchema,
  requestStatusSchema,
  serviceSchema,
  toPrismaRequestStatus,
  toPrismaRole,
  toPrismaServiceStatus
} from "./validators.js";

const app = Fastify({ logger: true, bodyLimit: 8 * 1024 * 1024 });
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);

await app.register(cors, {
  origin: process.env.CLIENT_ORIGIN ?? true
});

app.get("/health", async () => ({ ok: true }));

const webRoot = resolve(process.cwd(), "../web");
const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function sendWebFile(reply: FastifyReply, requestedPath: string) {
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(webRoot, safePath));
  if (!filePath.startsWith(webRoot)) {
    return reply.code(404).send({ message: "Not found" });
  }

  try {
    await access(filePath);
    return reply.type(mimeTypes[extname(filePath)] ?? "application/octet-stream").send(createReadStream(filePath));
  } catch {
    return reply.code(404).send({ message: "Not found" });
  }
}

app.get("/", async (_request, reply) => sendWebFile(reply, "index.html"));

app.get("/*", async (request, reply) => {
  const params = request.params as { "*": string };
  return sendWebFile(reply, params["*"]);
});

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({ message: "Datos invalidos.", issues: error.issues });
  }

  const normalized = error as { statusCode?: number; message?: string };
  const statusCode = normalized.statusCode ?? 500;
  if (statusCode >= 500) app.log.error(error);
  return reply.code(statusCode).send({ message: normalized.message || "Error interno." });
});

app.post("/auth/login", async (request, reply) => {
  const body = loginSchema.parse(request.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });

  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    return reply.code(401).send({ message: "Credenciales incorrectas." });
  }

  return { user: publicUser(user), token: createToken({ id: user.id, role: user.role }) };
});

app.get("/auth/me", async (request) => {
  const auth = requireAuth(request);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.id } });
  return { user: publicUser(user) };
});

app.get("/users", async (request) => {
  requireAdmin(request);
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return users.map(publicUser);
});

app.post("/users", async (request, reply) => {
  requireAdmin(request);
  const body = createUserSchema.parse(request.body);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: hashPassword(body.password),
      role: toPrismaRole(body.role)
    }
  });

  return reply.code(201).send(publicUser(user));
});

app.get("/services", async () => {
  const services = await prisma.service.findMany({ orderBy: { createdAt: "desc" } });
  return services.map(publicService);
});

app.post("/services", async (request, reply) => {
  requireAdmin(request);
  const body = serviceSchema.parse(request.body);
  const service = await prisma.service.create({
    data: {
      ...body,
      status: toPrismaServiceStatus(body.status)
    }
  });

  return reply.code(201).send(publicService(service));
});

app.put("/services/:id", async (request) => {
  requireAdmin(request);
  const { id } = request.params as { id: string };
  const body = serviceSchema.parse(request.body);
  const service = await prisma.service.update({
    where: { id },
    data: {
      ...body,
      status: toPrismaServiceStatus(body.status)
    }
  });

  return publicService(service);
});

app.get("/requests", async (request) => {
  const auth = requireAuth(request);
  const query: Prisma.TramiteRequestFindManyArgs = {
    include: { service: true, user: true },
    orderBy: { createdAt: "desc" },
    ...(auth.role === "ADMIN" ? {} : { where: { userId: auth.id } })
  };
  const requests = await prisma.tramiteRequest.findMany(query);
  return requests.map(publicRequest);
});

app.post("/requests", async (request, reply) => {
  const auth = requireAuth(request);
  const body = requestSchema.parse(request.body);
  const service = await prisma.service.findUniqueOrThrow({ where: { id: body.serviceId } });
  const total = Number(service.cost) + Number(service.fee);
  const created = await prisma.tramiteRequest.create({
    data: {
      userId: auth.role === "ADMIN" ? body.userId : auth.id,
      serviceId: body.serviceId,
      customerName: body.customerName,
      document: body.document,
      state: body.state,
      notes: body.notes,
      details: body.details,
      total
    },
    include: { service: true, user: true }
  });

  return reply.code(201).send(publicRequest(created));
});

app.patch("/requests/:id/status", async (request) => {
  requireAdmin(request);
  const { id } = request.params as { id: string };
  const body = requestStatusSchema.parse(request.body);
  const updated = await prisma.tramiteRequest.update({
    where: { id },
    data: { status: toPrismaRequestStatus(body.status) },
    include: { service: true, user: true }
  });

  return publicRequest(updated);
});

app.get("/requests/:id/document", async (request, reply) => {
  const auth = requireAuth(request);
  const { id } = request.params as { id: string };
  const tramiteRequest = await prisma.tramiteRequest.findUniqueOrThrow({
    where: { id },
    include: { service: true }
  });

  if (auth.role !== "ADMIN" && tramiteRequest.userId !== auth.id) {
    return reply.code(403).send({ message: "No autorizado." });
  }

  const pdf = await generateRequestPdf(tramiteRequest);
  const filename = `${tramiteRequest.service.code}-${tramiteRequest.id}.pdf`;
  return reply
    .type("application/pdf")
    .header("Content-Disposition", `attachment; filename="${filename}"`)
    .send(Buffer.from(pdf));
});

app.get("/payment-settings", async (request) => {
  requireAuth(request);
  const settings = await prisma.paymentSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      account: "PAPERANDOM Servicios",
      reference: "PAGO-TRAMITES",
      instructions: "Adjunta el comprobante al enviar tu solicitud."
    },
    update: {}
  });

  return publicPaymentSettings(settings);
});

app.put("/payment-settings", async (request) => {
  requireAdmin(request);
  const body = paymentSettingsSchema.parse(request.body);
  const settings = await prisma.paymentSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...body },
    update: body
  });

  return publicPaymentSettings(settings);
});

app.addHook("onClose", async () => {
  await closeDb();
});

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
