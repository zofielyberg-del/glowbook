const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const appointments = await prisma.appointment.findMany({
    where: {
      salon_id: '8d63f8fb-7922-4236-a038-67082058938a'
    },
    orderBy: { start_time: 'asc' }
  });
  console.log('Luxe By Essi Appointments:');
  console.log(JSON.stringify(appointments.map(a => ({
    id: a.id,
    customer_name: a.customer_name,
    customer_email: a.customer_email,
    service_name: a.service_name,
    start_time: a.start_time,
    booking_date: a.booking_date,
    status: a.status,
    payment_method: a.payment_method,
    total_price: a.total_price
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
