import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "cliente"]).default("cliente")
});

export const serviceFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "date", "number", "select", "textarea", "file"]),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  accept: z.string().optional()
});

export const serviceSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  category: z.string().min(1),
  documentKind: z.string().min(1),
  cost: z.coerce.number().nonnegative(),
  fee: z.coerce.number().nonnegative(),
  status: z.enum(["activo", "inactivo"]).default("activo"),
  description: z.string().min(1),
  requiredFields: z.array(serviceFieldSchema).default([]),
  requirements: z.array(z.string()).default([]),
  sampleFiles: z.array(z.string()).default([])
});

export const requestSchema = z.object({
  userId: z.string().min(1),
  serviceId: z.string().min(1),
  customerName: z.string().min(1),
  document: z.string().min(1),
  state: z.string().default(""),
  notes: z.string().default(""),
  details: z.record(z.string(), z.string()).default({})
});

export const requestStatusSchema = z.object({
  status: z.enum(["pendiente", "en proceso", "completado", "cancelado"])
});

export const paymentSettingsSchema = z.object({
  account: z.string().min(1),
  reference: z.string().min(1),
  instructions: z.string().min(1)
});

export function toPrismaRole(role: "admin" | "cliente"): "ADMIN" | "CLIENTE" {
  return role === "admin" ? "ADMIN" : "CLIENTE";
}

export function toPrismaServiceStatus(status: "activo" | "inactivo"): "ACTIVO" | "INACTIVO" {
  return status === "activo" ? "ACTIVO" : "INACTIVO";
}

export function toPrismaRequestStatus(status: "pendiente" | "en proceso" | "completado" | "cancelado") {
  if (status === "en proceso") return "EN_PROCESO";
  return status.toUpperCase() as "PENDIENTE" | "COMPLETADO" | "CANCELADO";
}
