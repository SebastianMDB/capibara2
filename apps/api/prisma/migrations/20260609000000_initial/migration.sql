CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLIENTE');

CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVO', 'INACTIVO');

CREATE TYPE "RequestStatus" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'CLIENTE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "services" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "documentKind" TEXT NOT NULL,
  "cost" DECIMAL(10,2) NOT NULL,
  "fee" DECIMAL(10,2) NOT NULL,
  "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVO',
  "description" TEXT NOT NULL,
  "requiredFields" JSONB NOT NULL,
  "requirements" TEXT[],
  "sampleFiles" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tramite_requests" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "document" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDIENTE',
  "total" DECIMAL(10,2) NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "details" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tramite_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "account" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE UNIQUE INDEX "services_code_key" ON "services"("code");

CREATE INDEX "tramite_requests_userId_idx" ON "tramite_requests"("userId");

CREATE INDEX "tramite_requests_serviceId_idx" ON "tramite_requests"("serviceId");

ALTER TABLE "tramite_requests"
  ADD CONSTRAINT "tramite_requests_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tramite_requests"
  ADD CONSTRAINT "tramite_requests_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "services"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
