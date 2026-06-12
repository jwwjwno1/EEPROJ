import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

  if (!connectionString) {
    return undefined;
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};

const prismaClient = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production" && prismaClient) {
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;
