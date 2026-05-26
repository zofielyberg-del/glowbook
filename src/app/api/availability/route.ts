import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

function timeToMins(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function minsToTime(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const salonId = searchParams.get('salonId');
        const serviceId = searchParams.get('serviceId');
        const targetPractitionerId = searchParams.get('practitionerId');
        const excludeAppointmentId = searchParams.get('excludeAppointmentId');

        if (!salonId || !serviceId) {
            return NextResponse.json({ error: 'Missing salonId or serviceId' }, { status: 400 });
        }

        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            include: {
                practitioners: true,
                appointments: {
                    where: {
                        status: { not: 'cancelled' }
                    }
                }
            }
        });

        const service = await prisma.service.findUnique({
            where: { id: serviceId }
        });

        if (!salon || !service) {
            return NextResponse.json({ error: 'Salon or Service not found' }, { status: 404 });
        }

        const serviceDuration = service.duration_minutes || 30;
        const step = serviceDuration;
        const allFrames: any[] = [];
        
        const now = new Date();
        const currentDayIdx = (now.getDay() + 6) % 7;
        const currentMins = now.getHours() * 60 + now.getMinutes();
        
        // Generate availability for the current week and the next 4 weeks
        const weeksToGenerate = 4;
        const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });

        const isLuxe = (salon.membership_tier || 'bas').toLowerCase() === 'luxe';
        
        let salonAvailability: any[] = salon.availability ? (salon.availability as any[]) : [];
        if (salonAvailability.length === 0) {
            salonAvailability = [0, 1, 2, 3, 4, 5, 6].map(dayIndex => ({
                dayIndex,
                startTime: '10:00',
                duration: 540
            }));
        }

        for (let w = 0; w < weeksToGenerate; w++) {
            const weekStart = addDays(currentWeekStart, w * 7);
            const weekStr = format(weekStart, 'yyyy-MM-dd');

            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const currentDate = addDays(weekStart, dayIndex);
                const dateStr = format(currentDate, 'yyyy-MM-dd');
                const todayStr = format(now, 'yyyy-MM-dd');
                
                if (dateStr < todayStr) continue;

                const dayAvailability = salonAvailability.filter(a => a.dayIndex === dayIndex);
                
                dayAvailability.forEach(frame => {
                    const frameStart = timeToMins(frame.startTime);
                    const frameEnd = frameStart + frame.duration;

                    for (let time = frameStart; time <= frameEnd - serviceDuration; time += step) {
                        const startTimeStr = minsToTime(time);
                        const startMins = time;
                        const endMins = time + serviceDuration;

                        if (dateStr === todayStr && startMins < currentMins + 15) continue;

                        let isAvailable = true;
                        let availablePractitionerId = 'owner';

                        if (isLuxe) {
                            const qualifiedPractitioners = salon.practitioners.filter(p => {
                                if (targetPractitionerId && targetPractitionerId !== 'any' && p.id !== targetPractitionerId) return false;
                                return true;
                            });

                            const availablePractitioners = qualifiedPractitioners.filter(p => {
                                const schedule = p.schedule as any || {};
                                const dayData = schedule[dayIndex];
                                if (!dayData || dayData.active !== true) return false;

                                const slots = dayData.slots || [];
                                if (slots.length === 0 && dayData.start && dayData.end) {
                                    slots.push({ start: dayData.start, end: dayData.end });
                                }

                                const isWithinPractitionerSlot = slots.some((slot: any) => {
                                    const pStart = timeToMins(slot.start);
                                    const pEnd = timeToMins(slot.end);
                                    return (startMins >= pStart && endMins <= pEnd);
                                });
                                if (!isWithinPractitionerSlot) return false;

                                const breaks = dayData.breaks || [];
                                const hasBreakOverlap = breaks.some((brk: any) => {
                                    const brkStart = timeToMins(brk.start);
                                    const brkEnd = brkStart + brk.duration;
                                    return (startMins < brkEnd && endMins > brkStart);
                                });
                                if (hasBreakOverlap) return false;

                                const hasAptOverlap = salon.appointments.some(apt => {
                                    if (apt.id === excludeAppointmentId) return false; // Ignore current booking being rescheduled
                                    if (apt.practitioner_id !== p.id && apt.practitioner_id !== 'any') return false;
                                    
                                    const aptDateStr = format(apt.start_time, 'yyyy-MM-dd');
                                    if (aptDateStr !== dateStr) return false;

                                    const aptStartMins = apt.start_time.getHours() * 60 + apt.start_time.getMinutes();
                                    const aptEndMins = apt.end_time ? apt.end_time.getHours() * 60 + apt.end_time.getMinutes() : aptStartMins + 30;

                                    return (startMins < aptEndMins && endMins > aptStartMins);
                                });

                                if (hasAptOverlap) return false;

                                return true;
                            });

                            if (availablePractitioners.length === 0) {
                                isAvailable = false;
                            } else {
                                availablePractitionerId = targetPractitionerId === 'any' ? availablePractitioners[0].id : availablePractitioners[0].id;
                            }
                        } else {
                            // Standard Salon Logic
                            const hasAptOverlap = salon.appointments.some(apt => {
                                if (apt.id === excludeAppointmentId) return false;
                                const aptDateStr = format(apt.start_time, 'yyyy-MM-dd');
                                if (aptDateStr !== dateStr) return false;

                                const aptStartMins = apt.start_time.getHours() * 60 + apt.start_time.getMinutes();
                                const aptEndMins = apt.end_time ? apt.end_time.getHours() * 60 + apt.end_time.getMinutes() : aptStartMins + 30;

                                return (startMins < aptEndMins && endMins > aptStartMins);
                            });

                            if (hasAptOverlap) isAvailable = false;
                        }

                        if (isAvailable) {
                            allFrames.push({
                                id: `avail-${dateStr}-${startTimeStr}-${availablePractitionerId}`,
                                startTime: startTimeStr,
                                duration: serviceDuration,
                                dayIndex: dayIndex,
                                practitionerId: availablePractitionerId,
                                week: weekStr,
                                date: dateStr // Explicitly return the exact date
                            });
                        }
                    }
                });
            }
        }

        return NextResponse.json({ success: true, availability: allFrames });

    } catch (error) {
        console.error('API Error /api/availability:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
