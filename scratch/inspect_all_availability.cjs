const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const salons = await prisma.salon.findMany({
    include: {
      owner: true,
    }
  });

  console.log(`Found ${salons.length} salons in DB.`);
  for (const s of salons) {
    console.log(`\n==================================================`);
    console.log(`Salon: ${s.name} (${s.id})`);
    console.log(`Owner: ${s.owner?.first_name} ${s.owner?.last_name} (${s.owner?.email})`);
    console.log(`Availability count in DB: ${Array.isArray(s.availability) ? s.availability.length : 0}`);
    console.log(`Availability frames:`);
    console.log(JSON.stringify(s.availability, null, 2));
    console.log(`==================================================`);
  }
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error("Error inspecting availability:", e);
});
