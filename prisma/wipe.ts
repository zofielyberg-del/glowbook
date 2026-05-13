import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning database...');
  await prisma.pointTransaction.deleteMany();
  await prisma.loyaltyBalance.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.practitioner.deleteMany();
  await prisma.salon.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.giftCard.deleteMany();
  console.log('Database cleaned successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
