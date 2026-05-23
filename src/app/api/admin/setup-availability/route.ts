import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const salons = await prisma.salon.findMany({
      include: { practitioners: true }
    });

    const defaultAvailability = [
      { dayIndex: 0, startTime: '09:00', duration: 480 },
      { dayIndex: 1, startTime: '09:00', duration: 480 },
      { dayIndex: 2, startTime: '09:00', duration: 480 },
      { dayIndex: 3, startTime: '09:00', duration: 480 },
      { dayIndex: 4, startTime: '09:00', duration: 480 },
    ];

    const defaultSchedule = {
      '0': { active: true, slots: [{ start: '09:00', end: '17:00' }], breaks: [] },
      '1': { active: true, slots: [{ start: '09:00', end: '17:00' }], breaks: [] },
      '2': { active: true, slots: [{ start: '09:00', end: '17:00' }], breaks: [] },
      '3': { active: true, slots: [{ start: '09:00', end: '17:00' }], breaks: [] },
      '4': { active: true, slots: [{ start: '09:00', end: '17:00' }], breaks: [] },
      '5': { active: false },
      '6': { active: false }
    };

    let updatedCount = 0;

    for (const salon of salons) {
      await prisma.salon.update({
        where: { id: salon.id },
        data: {
          availability: defaultAvailability,
        }
      });

      for (const practitioner of salon.practitioners) {
        await prisma.practitioner.update({
          where: { id: practitioner.id },
          data: {
            schedule: defaultSchedule
          }
        });
      }
      updatedCount++;
    }

    return NextResponse.json({ success: true, updated: updatedCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
