
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // 1. Get global points from profile
        const profile = await prisma.profile.findUnique({
            where: { id: userId },
            select: { total_points_earned: true }
        });

        // 2. Get per-salon balances
        const balances = await prisma.loyaltyBalance.findMany({
            where: { profile_id: userId },
            include: { salon: { select: { name: true } } }
        });

        // 3. Get transactions
        const transactions = await prisma.pointTransaction.findMany({
            where: { profile_id: userId },
            include: { salon: { select: { name: true } } },
            orderBy: { created_at: 'desc' }
        });

        return NextResponse.json({
            success: true,
            totalPointsEarned: profile?.total_points_earned || 0,
            balances: balances.map(b => ({
                providerId: b.salon_id,
                providerName: b.salon?.name || 'Okänd salong',
                currentPoints: b.current_points,
                totalEarned: b.total_earned,
                redeemedRewards: [] // TODO: Link with a rewards table if needed
            })),
            transactions: transactions.map(t => ({
                id: t.id,
                type: t.type,
                amount: t.amount,
                description: t.description,
                date: t.created_at,
                providerId: t.salon_id,
                providerName: t.salon?.name || 'Okänd salong'
            }))
        });

    } catch (error) {
        console.error('Error fetching loyalty data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
