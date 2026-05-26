import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const emails = ['carolinadakholm@gmail.com', 'zofielyberg@gmail.com'];
        let deleted = [];
        
        for (const email of emails) {
            const user = await prisma.profile.findUnique({
                where: { email }
            });
            
            if (user) {
                const salons = await prisma.salon.findMany({
                    where: { owner_id: user.id }
                });
                
                for (const salon of salons) {
                    await prisma.appointment.deleteMany({ where: { salon_id: salon.id } });
                    await prisma.service.deleteMany({ where: { salon_id: salon.id } });
                    await prisma.practitioner.deleteMany({ where: { salon_id: salon.id } });
                    await prisma.salon.delete({ where: { id: salon.id } });
                }
                
                await prisma.profile.delete({ where: { id: user.id } });
                deleted.push(email);
            }
        }
        return NextResponse.json({ success: true, deleted });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
