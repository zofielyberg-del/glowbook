
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { code } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'Code is required' }, { status: 400 });
        }

        const giftCard = await prisma.giftCard.findUnique({
            where: { code }
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
                currency: 'SEK',
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
