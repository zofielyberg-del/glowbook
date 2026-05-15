import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        // Fetch all salons with their owner and services
        const salons = await prisma.salon.findMany({
            include: {
                owner: true,
                practitioners: true,
                services: true,
            },
            orderBy: { created_at: 'desc' }
        });

        // Fetch all users (profiles)
        const users = await prisma.profile.findMany({
            orderBy: { created_at: 'desc' }
        });

        // Fetch verification requests (if any exist in DB, or mock from localStorage)
        // For now we assume they are handled via profiles or specific table
        
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
