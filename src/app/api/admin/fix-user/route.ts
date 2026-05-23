import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

export async function GET(request: Request) {
    try {
        const hashedPassword = await hashPassword('Recovery666');

        // Create or update bibizola33 account
        const bibi = await prisma.profile.upsert({
            where: { email: 'bibizola33@glowbook.se' },
            update: {
                role: 'provider',
                password_hash: hashedPassword,
            },
            create: {
                email: 'bibizola33@glowbook.se',
                role: 'provider',
                password_hash: hashedPassword,
                first_name: 'Zofie',
                last_name: 'Lyberg'
            }
        });

        // Also fix the original email just in case
        await prisma.profile.updateMany({
            where: { email: 'zofielyberg@gmail.com' },
            data: {
                role: 'provider',
                password_hash: hashedPassword,
            }
        });

        // Ensure there is a salon for bibizola33 so the login doesn't fail
        const existingSalon = await prisma.salon.findFirst({
            where: { owner_id: bibi.id }
        });

        if (!existingSalon) {
            await prisma.salon.create({
                data: {
                    name: 'Zofies Studio',
                    slug: 'zofies-studio-bibi',
                    owner_id: bibi.id,
                    membership_tier: 'PRO',
                    subscription_status: 'active'
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Accounts updated!',
            bibi
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
