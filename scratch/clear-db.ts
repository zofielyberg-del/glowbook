import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Rensar databasen på all testdata...');

  // Delete in order to avoid foreign key constraint violations
  await prisma.pointTransaction.deleteMany({});
  await prisma.loyaltyBalance.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.practitioner.deleteMany({});
  await prisma.salon.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.giftCard.deleteMany({});

  console.log('Databasen är nu helt tom och redo för skarpa registreringar! 🧹✨');
}

main()
  .catch((e) => {
    console.error('Ett fel uppstod vid rensningen:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
