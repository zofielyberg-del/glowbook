require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const salonId = '8d63f8fb-7922-4236-a038-67082058938a'; // Luxe By Essi
  console.log(`Fetching availability settings for salon ${salonId}...`);
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { name: true, availability: true, practitioners: true }
  });

  if (salon) {
    console.log(`Salon Name: ${salon.name}`);
    console.log(`Availability JSON:`, JSON.stringify(salon.availability, null, 2));
    console.log(`Practitioners:`);
    for (const p of salon.practitioners) {
      console.log(`- ${p.name} (ID: ${p.id}):`, JSON.stringify(p.schedule, null, 2));
    }
  } else {
    console.log('Salon not found.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
