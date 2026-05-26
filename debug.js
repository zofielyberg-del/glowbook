import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const salon = await prisma.salon.findFirst({
        where: { email: 'zofielyberg.del@gmail.com' },
        include: { practitioners: true, services: true, appointments: true }
    });
    console.log(JSON.stringify(salon, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
