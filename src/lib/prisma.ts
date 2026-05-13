import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';


const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not set');
    }

    const url = process.env.DATABASE_URL.replace('mysql://', 'mariadb://');
    const adapter = new PrismaMariaDb(url);
    return new PrismaClient({ adapter });
};



export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

