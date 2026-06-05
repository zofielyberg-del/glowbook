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

  console.log("Listing all salons and their services...");
  const salons = await prisma.salon.findMany({
    include: {
      services: true
    }
  });

  salons.forEach(s => {
    console.log(`Salon: ${s.name} (ID: ${s.id})`);
    console.log(`- Services count: ${s.services.length}`);
    s.services.forEach(ser => {
      console.log(`  * [${ser.id}] "${ser.name}" (${ser.price} kr, category: ${ser.category})`);
    });
  });

  console.log("\nListing all services in the database...");
  const allServices = await prisma.service.findMany();
  console.log(`Total services count: ${allServices.length}`);
  allServices.forEach(ser => {
    console.log(`  * [${ser.id}] "${ser.name}" (salon_id: ${ser.salon_id})`);
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error(e);
});
