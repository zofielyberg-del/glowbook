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

// Delete a user
export async function DELETE(req: Request) {
    try {
        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }
        await prisma.profile.delete({ where: { id: userId } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Admin DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
