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

  console.log("Fetching appointments with practitioner IDs...");
  const appointments = await prisma.appointment.findMany({
    where: { salon_id: "8d63f8fb-7922-4236-a038-67082058938a" }
  });

  appointments.forEach(apt => {
    console.log(`- Appointment: Service Name: "${apt.service_name}", Practitioner ID: "${apt.practitioner_id}"`);
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error(e);
});
