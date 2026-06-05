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

  console.log("Testing different Prisma filters on 'categories' for frisör...");

  // Try 1: Exact matches using contains or string_contains
  console.log("\n--- Try 1: string_contains ---");
  try {
    const res = await prisma.salon.findMany({
      where: {
        categories: { path: [], string_contains: "frisör" }
      }
    });
    console.log("Result length:", res.length);
  } catch (e) {
    console.error("Failed:", e.message);
  }

  // Try 2: string_contains with 'frisör' in lowercase/uppercase?
  console.log("\n--- Try 2: equals ---");
  try {
    const res = await prisma.salon.findMany({
      where: {
        categories: { equals: ["frisör"] }
      }
    });
    console.log("Result length:", res.length);
  } catch (e) {
    console.error("Failed:", e.message);
  }

  // Try 3: JSON array contains check
  console.log("\n--- Try 3: array_contains ---");
  try {
    const res = await prisma.salon.findMany({
      where: {
        categories: { array_contains: "frisör" }
      }
    });
    console.log("Result length:", res.length);
  } catch (e) {
    console.error("Failed:", e.message);
  }

  // Try 4: Raw SQL search
  console.log("\n--- Try 4: Raw SQL search ---");
  try {
    const res = await prisma.$queryRaw`SELECT id, name, categories FROM "Salon" WHERE categories::jsonb @> '["frisör"]'::jsonb`;
    console.log("Result:", res);
  } catch (e) {
    console.error("Failed:", e.message);
  }

  // Try 5: Is there any salon at all? Let's check with no category filter
  console.log("\n--- Try 5: All Salons with Categories ---");
  const all = await prisma.salon.findMany();
  all.forEach(s => {
    console.log(`${s.name}: category=${s.category}, categories=${JSON.stringify(s.categories)}, type=${typeof s.categories}`);
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => console.error(e));
