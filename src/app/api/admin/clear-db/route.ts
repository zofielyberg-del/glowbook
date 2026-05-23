import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        // Delete all appointments
        await prisma.$executeRawUnsafe('DELETE FROM appointments');
        
        // Delete all loyalty balances
        await prisma.$executeRawUnsafe('DELETE FROM loyalty_balances');
        
        // Delete all point transactions
        await prisma.$executeRawUnsafe('DELETE FROM point_transactions');
        
        // Delete all availabilities
        await prisma.$executeRawUnsafe('DELETE FROM availabilities');

        // Delete all services
        await prisma.$executeRawUnsafe('DELETE FROM services');
        
        // Delete all practitioners
        await prisma.$executeRawUnsafe('DELETE FROM practitioners');
        
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
            
            // Delete the profiles themselves
            await prisma.profile.deleteMany({
                where: { id: { in: nonAdminProfileIds } }
            });
        }
        
        return NextResponse.json({ success: true, message: `Deleted ${nonAdminProfileIds.length} users and their salons.` });
    } catch (error: any) {
        console.error('Clear DB Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
