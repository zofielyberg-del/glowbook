
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { email, firstName, lastName, phone, role } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        let profile;
        try {
            profile = await prisma.profile.upsert({
                where: { email },
                update: {
                    first_name: firstName,
                    last_name: lastName,
                    phone,
                    role: role || 'customer'
                },
                create: {
                    email,
                    first_name: firstName,
                    last_name: lastName,
                    phone,
                    role: role || 'customer'
                }
            });
        } catch (error) {
            console.error('Profile sync error:', error);
            return NextResponse.json({ error: 'Failed to sync profile' }, { status: 500 });
        }

        return NextResponse.json({ success: true, profile });

    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
