
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting total database cleanup...');
  
  try {
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
  } catch (err) {
    console.error('Cleanup failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
