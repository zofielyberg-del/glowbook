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

  console.log("Fetching Carolina Beauty details...");
  const salon = await prisma.salon.findUnique({
    where: { id: "1dda4894-1fbc-4d12-ac63-96ce971074df" },
    include: {
      services: true
    }
  });

  console.log("Name:", salon.name);
  console.log("Category (primary):", JSON.stringify(salon.category));
  console.log("Categories (list):", JSON.stringify(salon.categories));
  console.log("\nServices:");
  salon.services.forEach(s => {
    console.log(`- Service: "${s.name}" (category: "${s.category}")`);
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => console.error(e));
