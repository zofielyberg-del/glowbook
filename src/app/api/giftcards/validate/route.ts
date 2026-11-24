
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { code, salonId } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'Kod saknas' }, { status: 400 });
        }

        if (salonId) {
            const salon = await prisma.salon.findUnique({
                where: { id: salonId },
                select: {
                    id: true,
                    name: true,
                    stripe_account_id: true,
                    membership_tier: true
                }
            });

            if (!salon) {
                return NextResponse.json({ error: 'Salongen kunde inte hittas' }, { status: 404 });
            }

            if (!salon.stripe_account_id) {
                return NextResponse.json({
                    error: 'Denna salong har inte aktiverat Stripe och kan därför inte ta emot presentkort.'
                }, { status: 400 });
            }

            const activeTier = (salon.membership_tier || '').toLowerCase();
            if (!['pro', 'luxe'].includes(activeTier)) {
                return NextResponse.json({
                    error: 'Presentkort kan endast lösas in hos salonger med medlemskap Pro eller Luxe.'
                }, { status: 400 });
            }
        }

        const normalizedCode = String(code).trim().toUpperCase();
        const giftCard = await prisma.giftCard.findUnique({
            where: { code: normalizedCode }
        });

        if (!giftCard) {
            return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
        }

        if (giftCard.status !== 'active') {
            return NextResponse.json({ error: `Gift card is ${giftCard.status}` }, { status: 400 });
        }

        if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Gift card has expired' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            card: {
                code: giftCard.code,
                value: giftCard.value,
                remainingBalance: giftCard.remaining_balance,
                currency: giftCard.currency || 'SEK',
                expiresAt: giftCard.expires_at,
                recipientName: giftCard.recipient_name,
                status: giftCard.status
            }
        });

    } catch (error) {
        console.error('Error validating gift card:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
