const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Fetching full Carolina Beauty details...");
  const salon = await prisma.salon.findUnique({
    where: { id: "1dda4894-1fbc-4d12-ac63-96ce971074df" },
    include: {
      services: true,
      practitioners: true,
      owner: true
    }
  });

  console.log(JSON.stringify(salon, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => console.error(e));
