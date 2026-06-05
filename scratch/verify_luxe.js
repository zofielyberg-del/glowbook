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

  console.log("Updating Luxe by Essi verification status...");
  
  const salons = await prisma.salon.findMany();
  const luxe = salons.find(s => 
    s.name.toLowerCase().includes('luxe') || 
    s.slug.toLowerCase().includes('luxe')
  );

  if (!luxe) {
    console.log("❌ Luxe salon not found!");
    // Log available salons for diagnostics
    console.log("Available salons:");
    salons.forEach(s => console.log(`- ${s.name} (slug: ${s.slug})`));
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const updated = await prisma.salon.update({
    where: { id: luxe.id },
    data: {
      is_verified: true,
      verified_categories: ["Naglar"]
    }
  });

  console.log(`🎯 SUCCESSFULLY VERIFIED SALON: ${updated.name}`);
  console.log(`is_verified: ${updated.is_verified}`);
  console.log(`verified_categories: ${JSON.stringify(updated.verified_categories)}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error("Error verifying salon:", e);
});
