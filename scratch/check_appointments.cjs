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
  console.log('Fetching details of the last 3 appointments...');
  const appointments = await prisma.appointment.findMany({
    orderBy: { created_at: 'desc' },
    take: 3,
    include: {
      salon: true
    }
  });

  for (const apt of appointments) {
    console.log(`ID: ${apt.id}`);
    console.log(`Customer: ${apt.customer_name}`);
    console.log(`Salon: ${apt.salon?.name}`);
    console.log(`Service: ${apt.service_name}`);
    console.log(`Status: ${apt.status}`);
    console.log(`Booking Date in DB: ${apt.booking_date}`);
    console.log(`Start Time in DB (UTC): ${apt.start_time.toISOString()}`);
    console.log(`Start Time Local (sv-SE): ${apt.start_time.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })}`);
    console.log(`Created At: ${apt.created_at}`);
    console.log('-----------------------------------');
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
