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

  console.log("Searching for Luxe by Essi salon...");
  const salons = await prisma.salon.findMany();

  const luxe = salons.find(s => 
    s.name.toLowerCase().includes('luxe') || 
    s.slug.toLowerCase().includes('luxe')
  );

  if (!luxe) {
    console.log("❌ Luxe by Essi salon not found!");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log("\n==================================================");
  console.log(`🎯 FOUND SALON: ${luxe.name} (${luxe.id})`);
  console.log(`typeof luxe.category:`, typeof luxe.category);
  console.log(`JSON.stringify(luxe.category):`, JSON.stringify(luxe.category));
  console.log(`Array.isArray(luxe.category):`, Array.isArray(luxe.category));
  console.log(`typeof luxe.categories:`, typeof luxe.categories);
  console.log(`JSON.stringify(luxe.categories):`, JSON.stringify(luxe.categories));
  console.log("==================================================\n");

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error("Error:", e);
});
