const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching latest 5 appointments...');
  const appointments = await prisma.appointment.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    include: {
      salon: true
    }
  });

  for (const apt of appointments) {
    console.log(`ID: ${apt.id}`);
    console.log(`Customer: ${apt.customer_name} (${apt.customer_email})`);
    console.log(`Salon: ${apt.salon?.name} (Stripe Account: ${apt.salon?.stripe_account_id})`);
    console.log(`Service: ${apt.service_name}`);
    console.log(`Price: ${apt.total_price} SEK`);
    console.log(`Status: ${apt.status}`);
    console.log(`Payment ID: ${apt.payment_id}`);
    console.log(`Payment Method: ${apt.payment_method}`);
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
  });
