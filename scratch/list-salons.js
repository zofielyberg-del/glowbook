import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load base .env
dotenv.config();

// Load .env.local manually to avoid empty string overrides
if (fs.existsSync('.env.local')) {
    const localEnv = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in localEnv) {
        if (localEnv[k]) {
            process.env[k] = localEnv[k];
        }
    }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function list() {
    try {
        const salons = await prisma.salon.findMany({
            include: {
                services: true
            }
        });
        console.log(`Hittade ${salons.length} salonger:`);
        salons.forEach(s => {
            console.log(`- Salong: ${s.name} (ID: ${s.id}, Slug: ${s.slug || 'saknas'})`);
            console.log(`  Tjänster:`);
            s.services.forEach(ser => {
                console.log(`    * ${ser.name} - ${ser.price} SEK (ID: ${ser.id})`);
            });
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

list();
