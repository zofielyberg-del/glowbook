import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const apt = await prisma.appointment.findFirst({
            include: {
                salon: {
                    include: {
                        services: true,
                        practitioners: true
                    }
                }
            }
        });

        if (!apt) {
            return NextResponse.json({ error: 'No appointments' });
        }

        return NextResponse.json({ apt });
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
