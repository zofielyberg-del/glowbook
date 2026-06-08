import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
        }

        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                practitioner: true,
                salon: {
                    include: {
                        practitioners: true,
                        services: true
                    }
                }
            }
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            appointment: {
                ...appointment,
                salon: appointment.salon ? {
                    ...appointment.salon,
                    profileImage: appointment.salon.logo_url,
                    backgroundImage: appointment.salon.banner_url,
                    practitioners: (appointment.salon.practitioners || []).map(p => ({
                        ...p,
                        image: p.image_url
                    })),
                    services: (appointment.salon.services || []).map(s => ({
                        ...s,
                        duration: s.duration_minutes
                    }))
                } : null
            }
        });

    } catch (error) {
        console.error('Error fetching appointment:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
