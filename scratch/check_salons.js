const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const salons = await prisma.salon.findMany({
        include: {
            owner: true
        }
    });
    console.log(JSON.stringify(salons, null, 2));
}

main().catch(err => {
    console.error(err);
}).finally(() => {
    prisma.$disconnect();
});
