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

        if (!salonId || !serviceId || serviceId === 'undefined') {
            return NextResponse.json({ error: 'Missing salonId or serviceId' }, { status: 400 });
        }

        const twelveWeeksFromNow = addDays(new Date(), 84);

        // Run both DB queries in parallel for max speed
        const [salon, service] = await Promise.all([
            prisma.salon.findUnique({
                where: { id: salonId },
                include: {
                    practitioners: true,
                    appointments: {
                        where: {
                            status: { not: 'cancelled' },
                            start_time: { gte: new Date(), lte: twelveWeeksFromNow }
                        }
                    }
                }
            }),
            prisma.service.findUnique({
                where: { id: serviceId }
            })
        ]);

        if (!salon || !service) {
            return NextResponse.json({ error: 'Salon or Service not found' }, { status: 404 });
        }

        const serviceDuration = service.duration_minutes || 30;
        const step = serviceDuration;
        const allFrames: any[] = [];
        
        const now = new Date();
        const currentDayIdx = (now.getDay() + 6) % 7;
        const currentMins = now.getHours() * 60 + now.getMinutes();
        
        // Generate availability for the current week and the next 12 weeks
        const weeksToGenerate = 12;
        const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });

        const isLuxe = (salon.membership_tier || 'bas').toLowerCase() === 'luxe';
        
        let salonAvailability: any[] = Array.isArray(salon.availability) ? salon.availability : [];
        if (!salonAvailability || salonAvailability.length === 0) {
            // Fallback: If no salon availability is found (e.g., they downgraded from Luxe where schedule was on practitioner),
            // try to build salonAvailability from the first active practitioner's schedule
            const firstP = salon.practitioners?.find(p => p.schedule && Object.values(p.schedule as any).some((day: any) => day && day.active));
            if (firstP && firstP.schedule) {
                const sched = firstP.schedule as any;
                [0, 1, 2, 3, 4, 5, 6].forEach(dayIndex => {
                    const dayData = sched[dayIndex];
                    if (dayData && dayData.active && dayData.start && dayData.end) {
                        const sMins = timeToMins(dayData.start);
                        const eMins = timeToMins(dayData.end);
                        if (eMins > sMins) {
                            salonAvailability.push({
                                dayIndex,
                                startTime: dayData.start,
                                duration: eMins - sMins
                            });
                        }
                    }
                });
            }

            // Final fallback if STILL empty (Disabled: Only show times that the provider has actually posted)
            if (salonAvailability.length === 0) {
                salonAvailability = [];
            }
        }

        const debugLog: string[] = [];
        debugLog.push(`Salon Tier: ${salon.membership_tier}`);
        debugLog.push(`Practitioners: ${salon.practitioners?.length}`);
        debugLog.push(`Target Practitioner: ${targetPractitionerId}`);
        debugLog.push(`Is Luxe: ${isLuxe}`);
        debugLog.push(`Salon Availability count: ${salonAvailability.length}`);

        for (let w = 0; w < weeksToGenerate; w++) {
            const weekStart = addDays(currentWeekStart, w * 7);
            const weekStr = format(weekStart, 'yyyy-MM-dd');

            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const currentDate = addDays(weekStart, dayIndex);
                const dateStr = format(currentDate, 'yyyy-MM-dd');
                const todayStr = format(now, 'yyyy-MM-dd');
                
                if (dateStr < todayStr) continue;

                const dayAvailability = salonAvailability.filter(a => {
                    if (a.dayIndex !== dayIndex) return false;
                    if (a.week && a.week !== weekStr) return false;
                    return true;
                });
                if (dayAvailability.length > 0 && w === 0) {
                    debugLog.push(`Day ${dayIndex} (${dateStr}) has ${dayAvailability.length} frames`);
                }
                
                dayAvailability.forEach(frame => {
                    const frameStart = timeToMins(frame.startTime);

                    let timesToCheck: number[] = [];
                    if (frame.isSingleSlot) {
                        timesToCheck.push(frameStart);
                    } else {
                        const frameEnd = frameStart + (frame.duration || 60);
                        for (let time = frameStart; time <= frameEnd - serviceDuration; time += step) {
                            timesToCheck.push(time);
                        }
                    }

                    timesToCheck.forEach(time => {
                        const startTimeStr = minsToTime(time);
                        const startMins = time;
                        const endMins = time + serviceDuration;

                        if (dateStr === todayStr && startMins < currentMins + 15) return;

                        let isAvailable = true;
                        let availablePractitionerId = 'owner';

                        // Check if any practitioner has an active schedule overall
                        const anyPractitionerHasSchedule = isLuxe && salon.practitioners && salon.practitioners.some(p => {
                            return p.schedule && Object.values(p.schedule as any).some((day: any) => day && day.active);
                        });

                        if (anyPractitionerHasSchedule) {
                            let qualifiedPractitioners = salon.practitioners!.filter(p => {
                                if (targetPractitionerId && targetPractitionerId !== 'any' && p.id !== targetPractitionerId) return false;
                                return true;
                            });

                            if (qualifiedPractitioners.length === 0) {
                                qualifiedPractitioners = salon.practitioners!; 
                            }

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
                                    if (apt.id === excludeAppointmentId) return false; 
                                    if (apt.practitioner_id !== p.id && apt.practitioner_id !== 'any') return false;
                                    
                                    const aptDateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(apt.start_time);
                                    if (aptDateStr !== dateStr) return false;

                                    const startParts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', hour12: false }).format(apt.start_time).split(':').map(Number);
                                    const aptStartMins = startParts[0] * 60 + startParts[1];
                                    const duration = apt.end_time ? Math.round((new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime()) / 60000) : 30;
                                    const aptEndMins = aptStartMins + duration;

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
                            // Standard Salon Logic (Fallback for BAS/PRO, OR Luxe if no practitioners have schedules)
                            const hasAptOverlap = salon.appointments.some(apt => {
                                if (apt.id === excludeAppointmentId) return false;
                                const aptDateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(apt.start_time);
                                if (aptDateStr !== dateStr) return false;

                                const startParts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', hour12: false }).format(apt.start_time).split(':').map(Number);
                                const aptStartMins = startParts[0] * 60 + startParts[1];
                                const duration = apt.end_time ? Math.round((new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime()) / 60000) : 30;
                                const aptEndMins = aptStartMins + duration;

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
                                date: dateStr 
                            });
                        }
                    });
                });
            }
        }

        const noCacheHeaders = {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        };

        if (allFrames.length === 0) {
            return NextResponse.json(
                { success: true, availability: [], debug: debugLog.join(" | ") },
                { headers: noCacheHeaders }
            );
        }

        return NextResponse.json(
            { success: true, availability: allFrames, debug: "Found " + allFrames.length },
            { headers: noCacheHeaders }
        );

    } catch (error) {
        console.error('API Error /api/availability:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
