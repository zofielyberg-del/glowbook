const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const appointments = await prisma.appointment.findMany({
        orderBy: { created_at: 'desc' },
        take: 3
    });
    console.log(JSON.stringify(appointments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
