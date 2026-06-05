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
  const salons = await prisma.salon.findMany({
    include: {
      services: true
    }
  });

  const luxe = salons.find(s => 
    s.name.toLowerCase().includes('luxe') || 
    s.slug.toLowerCase().includes('luxe')
  );

  if (!luxe) {
    console.log("❌ Luxe by Essi salon not found!");
    console.log("Available salons:");
    salons.forEach(s => console.log(`- ${s.name} (slug: ${s.slug})`));
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log("\n==================================================");
  console.log(`🎯 FOUND SALON: ${luxe.name} (${luxe.id})`);
  console.log(`Slug: ${luxe.slug}`);
  console.log(`Category: ${luxe.category}`);
  console.log(`Categories: ${JSON.stringify(luxe.categories)}`);
  console.log(`\nServices count: ${luxe.services.length}`);
  luxe.services.forEach((s, idx) => {
    console.log(`- Service ${idx+1}: ID: ${s.id}, Name: "${s.name}", Category: "${s.category}"`);
  });
  console.log("==================================================\n");

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error("Error inspecting database:", e);
});
