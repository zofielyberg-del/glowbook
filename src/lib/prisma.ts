import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5, // Keep connections reasonable but allow concurrency under transient load
    idleTimeoutMillis: 15000, // Close idle connections quickly (15 seconds)
    connectionTimeoutMillis: 10000, // Allow up to 10 seconds to establish a connection under load
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

// Keep the instance globally in all environments (including production)
// to prevent serverless functions from spawning multiple pools on hot reloads
globalForPrisma.prisma = prisma;
