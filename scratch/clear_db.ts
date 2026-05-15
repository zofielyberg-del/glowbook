
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting total database cleanup...');
  
  // Order matters due to foreign keys
  await prisma.loyaltyTransaction.deleteMany({});
  await prisma.loyaltyPoint.deleteMany({});
  await prisma.giftCard.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.practitioner.deleteMany({});
  await prisma.salon.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log('Database cleared successfully!');
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
