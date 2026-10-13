import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export function getPrismaClient() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("[YOUR-PASSWORD]")) {
    throw new Error("DATABASE_URL is not configured with a real password.");
  }

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  globalForPrisma.prisma = client;
  return client;
}

export async function connectToDatabase() {
  const client = getPrismaClient();
  await client.$connect();
  await client.$queryRaw`SELECT 1`;
}

export async function checkDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("[YOUR-PASSWORD]")) return false;
  await getPrismaClient().$queryRaw`SELECT 1`;
  return true;
}

export async function disconnectFromDatabase() {
  await globalForPrisma.prisma?.$disconnect();
}
