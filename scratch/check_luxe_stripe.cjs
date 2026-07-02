const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const salon = await prisma.salon.findUnique({
        where: { id: '8d63f8fb-7922-4236-a038-67082058938a' },
        select: { id: true, name: true, stripe_account_id: true, membership_tier: true }
    });
    console.log('SALON DETAILS:', salon);

    const appointments = await prisma.appointment.findMany({
        where: { salon_id: '8d63f8fb-7922-4236-a038-67082058938a' },
        orderBy: { created_at: 'desc' },
        take: 5
    });
    console.log('LATEST APPOINTMENTS:', appointments);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
