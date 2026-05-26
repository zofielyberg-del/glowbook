import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        await prisma.appointment.deleteMany({});
        await prisma.service.deleteMany({});
        await prisma.practitioner.deleteMany({});
        await prisma.salon.deleteMany({});
        await prisma.profile.deleteMany({});
        
        return NextResponse.json({ success: true, message: 'Database cleared' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
