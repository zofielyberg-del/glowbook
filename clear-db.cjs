const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Starting DB clearance...");
        
        // Delete all appointments
        const apts = await prisma.$executeRawUnsafe('DELETE FROM appointments');
        console.log("Appointments deleted");
        
        // Delete all loyalty balances
        await prisma.$executeRawUnsafe('DELETE FROM loyalty_balances');
        console.log("Loyalty deleted");
        
        // Delete all point transactions
        await prisma.$executeRawUnsafe('DELETE FROM point_transactions');
        console.log("Points deleted");

        // Delete all services
        await prisma.$executeRawUnsafe('DELETE FROM services');
        console.log("Services deleted");
        
        // Delete all practitioners
        await prisma.$executeRawUnsafe('DELETE FROM practitioners');
        console.log("Practitioners deleted");
        
        // Find non-admin profiles
        const nonAdminProfiles = await prisma.profile.findMany({
            where: { role: { not: 'admin' } },
            select: { id: true }
        });
        
        const nonAdminProfileIds = nonAdminProfiles.map(p => p.id);
        
        if (nonAdminProfileIds.length > 0) {
            // Delete salons belonging to non-admins
            await prisma.salon.deleteMany({
                where: { owner_id: { in: nonAdminProfileIds } }
            });
            console.log("Salons deleted");
            
            // Delete the profiles themselves
            await prisma.profile.deleteMany({
                where: { id: { in: nonAdminProfileIds } }
            });
            console.log("Non-admin profiles deleted");
        }
        
        console.log("DB cleared successfully.");
    } catch (error) {
        console.error('Clear DB Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
