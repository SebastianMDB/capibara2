import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
}
