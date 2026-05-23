const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.profile.findMany({
        orderBy: { created_at: 'desc' },
        take: 5
    });
    console.log("Recent Users:");
    console.log(users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
