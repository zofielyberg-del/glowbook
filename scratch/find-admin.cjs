const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const admins = await prisma.profile.findMany({ where: { role: 'admin' } });
    console.log("Admins:");
    console.log(admins);
}
main().finally(() => prisma.$disconnect());
