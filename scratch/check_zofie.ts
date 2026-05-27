import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'zofielyberg@gmail.com';
  const profile = await prisma.profile.findUnique({
    where: { email }
  });
  
  console.log('Profile for', email, ':', JSON.stringify(profile, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
