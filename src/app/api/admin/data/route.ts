import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const salons = await prisma.salon.findMany({
            include: {
                owner: true,
                practitioners: true,
                services: true,
            },
            orderBy: { created_at: 'desc' }
        });

        const users = await prisma.profile.findMany({
            orderBy: { created_at: 'desc' }
        });

        return NextResponse.json({
            success: true,
            salons,
            users,
            stats: {
                totalSalons: salons.length,
                totalUsers: users.length,
                totalPractitioners: salons.reduce((acc, s) => acc + s.practitioners.length, 0),
            }
        });
    } catch (error) {
        console.error('Admin Data Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch admin data' }, { status: 500 });
    }
}

// Update a user's role
export async function PATCH(req: Request) {
    try {
        const { userId, role } = await req.json();
        if (!userId || !role) {
            return NextResponse.json({ error: 'userId and role required' }, { status: 400 });
        }
        const updated = await prisma.profile.update({
            where: { id: userId },
            data: { role }
        });
        return NextResponse.json({ success: true, user: updated });
    } catch (error: any) {
        console.error('Admin PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Delete a user or salon
export async function DELETE(req: Request) {
    try {
        const { userId, salonId } = await req.json();
        
        if (userId) {
            // Delete all salons owned by the user first to avoid database orphaning
            const salons = await prisma.salon.findMany({ where: { owner_id: userId } });
            for (const s of salons) {
                await prisma.salon.delete({ where: { id: s.id } });
            }
            await prisma.profile.delete({ where: { id: userId } });
            return NextResponse.json({ success: true });
        }
        
        if (salonId) {
            // Find if there is an owner profile linked to this salon
            const salon = await prisma.salon.findUnique({
                where: { id: salonId },
                select: { owner_id: true }
            });
            // Delete the salon
            await prisma.salon.delete({ where: { id: salonId } });
            // If it had an owner, delete the owner's profile too
            if (salon?.owner_id) {
                await prisma.profile.delete({ where: { id: salon.owner_id } });
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'userId or salonId required' }, { status: 400 });
    } catch (error: any) {
        console.error('Admin DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
