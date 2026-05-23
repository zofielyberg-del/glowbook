import { prisma } from '../src/lib/prisma';

async function main() {
  const deleted = await prisma.salon.deleteMany();
  console.log('Deleted salons count:', deleted.count);
}

main()
  .catch((e) => {
    console.error('Error clearing salons:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
