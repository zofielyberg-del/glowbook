import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Clearing DB...');
        await prisma.appointment.deleteMany({});
        await prisma.loyaltyBalance.deleteMany({});
        await prisma.pointTransaction.deleteMany({});
        await prisma.availability.deleteMany({});
        await prisma.service.deleteMany({});
        await prisma.practitioner.deleteMany({});
        
        const nonAdminProfiles = await prisma.profile.findMany({
            where: { role: { not: 'admin' } },
            select: { id: true }
        });
        const nonAdminIds = nonAdminProfiles.map(p => p.id);
        
        if (nonAdminIds.length > 0) {
            await prisma.salon.deleteMany({
                where: { owner_id: { in: nonAdminIds } }
            });
            await prisma.profile.deleteMany({
                where: { id: { in: nonAdminIds } }
            });
        }
        console.log('Cleared DB!');
    } catch (e) {
        console.error(e);
    }
}
main().finally(() => prisma.$disconnect());
