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
  const s = await prisma.salon.findFirst({
    where: { slug: 'carolina-beauty' },
    include: { services: true }
  });

  if (s) {
    console.log("Salon Name:", s.name);
    console.log("Category type:", typeof s.category, "Value:", s.category);
    console.log("Categories type:", typeof s.categories, "Value:", s.categories, "IsArray:", Array.isArray(s.categories));
    console.log("Database Raw Row:");
    console.log(JSON.stringify(s, null, 2));
  } else {
    console.log("Carolina Beauty not found!");
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => console.error(e));
