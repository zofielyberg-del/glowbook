import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const salons = await prisma.salon.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                membership_tier: true,
                subscription_status: true,
                stripe_subscription_id: true,
                stripe_customer_id: true,
                created_at: true
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        return NextResponse.json({
            success: true,
            salons
        });
    } catch (error: any) {
        console.error('Check status error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
