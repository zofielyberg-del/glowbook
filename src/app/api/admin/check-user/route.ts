import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Lägg till ?email=din@mail.com i URLen' }, { status: 400 });
    }

    try {
        const user = await prisma.profile.findUnique({
            where: { email }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found in profile table.' }, { status: 404 });
        }

        const salon = await prisma.salon.findFirst({
            where: { owner_id: user.id }
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                has_password: !!user.password_hash
            },
            salon: salon ? {
                id: salon.id,
                slug: salon.slug,
                name: salon.name
            } : null
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
