const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const salons = await prisma.salon.findMany({
        include: {
            owner: true
        }
    });
    console.log(JSON.stringify(salons, null, 2));
}

main().catch(err => {
    console.error(err);
}).finally(() => {
    prisma.$disconnect();
});
