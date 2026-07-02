import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action'); // 'list' or 'update'

        if (action === 'update') {
            // Find and update Carolina Beauty
            const carolinaUpdate = await prisma.salon.updateMany({
                where: {
                    name: {
                        contains: 'Carolina',
                        mode: 'insensitive'
                    }
                },
                data: {
                    subscription_status: 'active',
                    membership_tier: 'luxe', // Give Luxe tier!
                    stripe_subscription_id: null,
                    stripe_customer_id: null
                }
            });

            // Find and update Luxe By Essi (their own salon)
            const glowbookUpdate = await prisma.salon.updateMany({
                where: {
                    name: {
                        contains: 'Essi',
                        mode: 'insensitive'
                    }
                },
                data: {
                    subscription_status: 'active',
                    membership_tier: 'luxe', // Give Luxe tier!
                    stripe_subscription_id: null,
                    stripe_customer_id: null
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Salons updated to lifetime Luxe tier with Stripe disconnected.',
                carolinaUpdate,
                glowbookUpdate
            });
        }

        // Default: just list all salons
        const salons = await prisma.salon.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                membership_tier: true,
                subscription_status: true,
                stripe_subscription_id: true,
                stripe_customer_id: true
            }
        });

        return NextResponse.json({
            success: true,
            salons
        });
    } catch (error: any) {
        console.error('Free salons error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
