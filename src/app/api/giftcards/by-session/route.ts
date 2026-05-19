import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('session_id');

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        // Retrieve the session from Stripe to verify and get metadata
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (session.metadata?.type !== 'giftcard') {
            return NextResponse.json({ error: 'Invalid session type' }, { status: 400 });
        }

        const { recipientEmail, recipientName, senderName, amount } = session.metadata;

        // Find the gift card in our database
        // Webhook might have generated it
        const giftCard = await prisma.giftCard.findFirst({
            where: {
                recipient_email: recipientEmail,
                recipient_name: recipientName,
                sender_name: senderName,
                value: parseFloat(amount),
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        if (!giftCard) {
            return NextResponse.json({ error: 'Gift card not found yet' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            card: {
                code: giftCard.code,
                value: Number(giftCard.value),
                remainingBalance: Number(giftCard.remaining_balance),
                recipientName: giftCard.recipient_name,
                recipientEmail: giftCard.recipient_email,
                senderName: giftCard.sender_name,
                message: giftCard.message,
                expiresAt: giftCard.expires_at,
                status: giftCard.status
            }
        });

    } catch (error: any) {
        console.error('Error fetching gift card by session:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
