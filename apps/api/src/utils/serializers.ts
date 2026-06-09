import type { PaymentSettings, Service, TramiteRequest, User } from "@prisma/client";

export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function publicService(service: Service) {
  return {
    ...service,
    status: service.status.toLowerCase(),
    cost: Number(service.cost),
    fee: Number(service.fee)
  };
}

export function publicRequest(request: TramiteRequest & { service?: Service; user?: User }) {
  return {
    ...request,
    date: request.createdAt.toISOString().slice(0, 10),
    serviceName: request.service?.name ?? "",
    status: request.status.toLowerCase().replace("_", " "),
    total: Number(request.total),
    service: request.service ? publicService(request.service) : undefined,
    user: request.user ? publicUser(request.user) : undefined
  };
}

export function publicPaymentSettings(settings: PaymentSettings) {
  return settings;
}
