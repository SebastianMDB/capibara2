import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { seedState } from "@paperandom/shared/seed";
import { hashPassword } from "../src/security/password.js";
import { toPrismaRole, toPrismaServiceStatus } from "../src/validators.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  for (const user of seedState.users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        name: user.name,
        email: user.email,
        passwordHash: hashPassword(user.password ?? ""),
        role: toPrismaRole(user.role)
      },
      update: {
        name: user.name,
        role: toPrismaRole(user.role)
      }
    });
  }

  for (const service of seedState.services) {
    await prisma.service.upsert({
      where: { code: service.code },
      create: {
        name: service.name,
        code: service.code,
        category: service.category,
        documentKind: service.documentKind,
        cost: service.cost,
        fee: service.fee,
        status: toPrismaServiceStatus(service.status),
        description: service.description,
        requiredFields: service.requiredFields as unknown as Prisma.InputJsonValue,
        requirements: service.requirements,
        sampleFiles: service.sampleFiles
      },
      update: {
        name: service.name,
        category: service.category,
        documentKind: service.documentKind,
        cost: service.cost,
        fee: service.fee,
        status: toPrismaServiceStatus(service.status),
        description: service.description,
        requiredFields: service.requiredFields as unknown as Prisma.InputJsonValue,
        requirements: service.requirements,
        sampleFiles: service.sampleFiles
      }
    });
  }

  await prisma.service.updateMany({
    where: { code: { notIn: seedState.services.map((service) => service.code) } },
    data: { status: "INACTIVO" }
  });

  await prisma.paymentSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...seedState.qr },
    update: seedState.qr
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
