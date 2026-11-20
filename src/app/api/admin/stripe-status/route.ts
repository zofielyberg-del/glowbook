import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const salonId = searchParams.get('salonId') || '8d63f8fb-7922-4236-a038-67082058938a';

        // 1. Check Platform Balance
        let platformBalance: any = null;
        let balanceError: string | null = null;
        try {
            platformBalance = await stripe.balance.retrieve();
        } catch (bErr: any) {
            balanceError = bErr?.message || String(bErr);
        }

        // 2. Check Salon Stripe Account
        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            select: { id: true, name: true, stripe_account_id: true }
        });

        let salonAccount: any = null;
        let salonAccountError: string | null = null;
        let recentTransfers: any = null;

        if (salon?.stripe_account_id) {
            try {
                salonAccount = await stripe.accounts.retrieve(salon.stripe_account_id);
            } catch (aErr: any) {
                salonAccountError = aErr?.message || String(aErr);
            }

            try {
                const trList = await stripe.transfers.list({
                    destination: salon.stripe_account_id,
                    limit: 5
                });
                recentTransfers = trList.data;
            } catch (tErr: any) {
                recentTransfers = { error: tErr?.message || String(tErr) };
            }
        }

        // 3. Test Transfer dry-run or attempt
        let testTransferResult: any = null;
        const doTransfer = searchParams.get('transfer') === 'true';
        if (doTransfer && salon?.stripe_account_id) {
            try {
                const tr = await stripe.transfers.create({
                    amount: 300, // 3 SEK
                    currency: 'sek',
                    destination: salon.stripe_account_id,
                    description: 'Testöverföring från Glowbook Diagnostik'
                });
                testTransferResult = { success: true, transfer: tr };
            } catch (trErr: any) {
                testTransferResult = {
                    success: false,
                    error: trErr?.message,
                    type: trErr?.type,
                    code: trErr?.code
                };
            }
        }

        return NextResponse.json({
            platformBalance,
            balanceError,
            salon,
            salonAccount: salonAccount ? {
                id: salonAccount.id,
                charges_enabled: salonAccount.charges_enabled,
                payouts_enabled: salonAccount.payouts_enabled,
                capabilities: salonAccount.capabilities,
                requirements: salonAccount.requirements?.currently_due
            } : null,
            salonAccountError,
            recentTransfers,
            testTransferResult
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
}
