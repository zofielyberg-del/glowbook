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

  console.log("Fetching all salons...");
  const salons = await prisma.salon.findMany({
    include: {
      owner: true
    }
  });

  console.log("\n==================================================");
  salons.forEach((s, idx) => {
    console.log(`Salon ${idx+1}: ID: ${s.id}`);
    console.log(`  Name: "${s.name}"`);
    console.log(`  Slug: "${s.slug}"`);
    console.log(`  Category: "${s.category}"`);
    console.log(`  Categories: ${JSON.stringify(s.categories)}`);
    console.log(`  Owner Email: "${s.owner?.email}"`);
    console.log(`  Owner Name: "${s.owner?.first_name} ${s.owner?.last_name}"`);
    console.log("--------------------------------------------------");
  });
  console.log("==================================================\n");

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error("Error:", e);
});
