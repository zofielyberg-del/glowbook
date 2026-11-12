import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
    try {
        const { salonId, email, userId } = await req.json();

        if (!salonId && !email && !userId) {
            return NextResponse.json({ error: 'Saknar kontoidentifiering' }, { status: 400 });
        }

        const normalizedEmail = email ? String(email).toLowerCase().trim() : undefined;

        let salon = salonId
            ? await prisma.salon.findFirst({
                where: { OR: [{ id: salonId }, { slug: salonId }, { owner_id: salonId }] },
                include: { owner: true },
            })
            : null;

        let profile = userId
            ? await prisma.profile.findUnique({ where: { id: userId } })
            : salon?.owner
            ? salon.owner
            : normalizedEmail
            ? await prisma.profile.findFirst({
                where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            })
            : null;

        if (!salon && profile) {
            salon = await prisma.salon.findFirst({
                where: { owner_id: profile.id },
                include: { owner: true },
            });
        }

        if (!salon && !profile) {
            return NextResponse.json({ error: 'Konto hittades inte' }, { status: 404 });
        }

        // 1. Cancel any active or trialing Stripe subscriptions immediately by subscription ID
        if (salon?.stripe_subscription_id) {
            try {
                await stripe.subscriptions.cancel(salon.stripe_subscription_id);
            } catch (stripeErr: any) {
                console.error('[Delete Account] Failed to cancel Stripe subscription by ID:', stripeErr?.message || stripeErr);
            }
        }

        // 2. Cancel subscriptions via Stripe customer ID if stored on salon
        if (salon?.stripe_customer_id) {
            try {
                const subs = await stripe.subscriptions.list({ customer: salon.stripe_customer_id, status: 'all', limit: 10 });
                for (const sub of subs.data) {
                    if (['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(sub.status)) {
                        try {
                            await stripe.subscriptions.cancel(sub.id);
                        } catch (subCancelErr: any) {
                            console.error('[Delete Account] Failed to cancel sub for salon customer:', sub.id, subCancelErr?.message);
                        }
                    }
                }
            } catch (stripeCustErr: any) {
                console.error('[Delete Account] Failed lookup by salon.stripe_customer_id:', stripeCustErr?.message || stripeCustErr);
            }
        }

        // 3. Cancel subscriptions via email lookup across Stripe customers
        const lookupEmail = profile?.email || salon?.owner?.email || normalizedEmail;
        if (lookupEmail) {
            try {
                const customers = await stripe.customers.list({ email: lookupEmail, limit: 5 });
                for (const cust of customers.data) {
                    const subs = await stripe.subscriptions.list({ customer: cust.id, status: 'all', limit: 10 });
                    for (const sub of subs.data) {
                        if (['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(sub.status)) {
                            try {
                                await stripe.subscriptions.cancel(sub.id);
                            } catch (subErr: any) {
                                console.error('[Delete Account] Failed to cancel sub:', sub.id, subErr?.message);
                            }
                        }
                    }
                }
            } catch (stripeErr: any) {
                console.error('[Delete Account] Failed Stripe customer subscription cleanup:', stripeErr?.message || stripeErr);
            }
        }

        await prisma.$transaction(async (tx) => {
            if (profile) {
                await tx.salon.deleteMany({ where: { owner_id: profile.id } });
                await tx.appointment.updateMany({
                    where: { customer_id: profile.id },
                    data: { customer_id: null },
                });
                await tx.punchCard.updateMany({
                    where: { customer_id: profile.id },
                    data: { customer_id: null },
                });
                await tx.profile.delete({ where: { id: profile.id } });
            } else if (salon) {
                await tx.salon.delete({ where: { id: salon.id } });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Delete Account] Error:', error);
        return NextResponse.json({ error: error.message || 'Kunde inte ta bort kontot' }, { status: 500 });
    }
}
