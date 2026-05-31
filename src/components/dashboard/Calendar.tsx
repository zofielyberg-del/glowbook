
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Clock, Edit3, ShieldAlert, CalendarCheck, Coffee, AlertTriangle } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { sv, nb, da, fi, is } from "date-fns/locale";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

type TimeFrame = {
    id: string;
    startTime: string;
    duration: number;
    dayIndex: number;
    practitionerId?: string;
    practitionerIds?: string[]; // Array of qualified practitioners for this slot
};

type Appointment = {
    id: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    service: string;
    startTime: string; // HH:mm
    duration: number; // minutes
    dayIndex: number; // 0-6 (Mon-Sun)
    price?: number;
    status?: 'confirmed' | 'completed' | 'cancelled';
    color: string;
    practitionerId?: string;
    start_time?: string;
    end_time?: string;
    date?: string;
    booking_date?: string;
};

type CalendarProps = {
    onSelectSlot?: (date: string, startTime: string, practitionerId?: string) => void;
    onCancelAppointment?: (appointmentId: string) => void;
    availability?: TimeFrame[];
    appointments?: Appointment[];
    hideAppointments?: boolean;
};

function timeToMins(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function minsToTime(m: number): string {
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

type EditingFrame = {
    frame: TimeFrame;
    dayIndex: number;
    segments: FrameSegment[];
};

type FrameSegment = {
    start: string;
    end: string;
    type: 'free' | 'booked';
    appointment?: Appointment;
};

export default function Calendar({ onSelectSlot, onCancelAppointment, availability: propAvailability, appointments: propAppointments, hideAppointments = false }: CalendarProps) {
    const { language, t } = useLanguage();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [internalAvailability, setInternalAvailability] = useState<TimeFrame[]>([]);
    const [internalAppointments, setInternalAppointments] = useState<Appointment[]>([]);
    const [editingFrame, setEditingFrame] = useState<EditingFrame | null>(null);
    const [addingSlot, setAddingSlot] = useState<{ dayIndex: number; hour: number; date: Date } | null>(null);
    const [newSlotTimes, setNewSlotTimes] = useState({ from: '09:00', to: '17:00' });
    const [applyToAllWeeks, setApplyToAllWeeks] = useState(true);
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);
    const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);

    const availability = propAvailability || internalAvailability;
    const appointments = propAppointments || internalAppointments;

    // Load data on mount and listen for changes
    useEffect(() => {
        let isMounted = true;
        let eventSource: EventSource | null = null;
        let retryTimeout: NodeJS.Timeout | null = null;

        const loadData = () => {
            try {
                const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
                if (saved) {
                    const data = JSON.parse(saved);
                    if (data.availability) {
                        let hasChanges = false;
                        const normalized = data.availability.map((f: any) => {
                            if (!f.id) {
                                hasChanges = true;
                                return { ...f, id: `frame-${f.dayIndex}-${f.startTime}` };
                            }
                            return f;
                        });
                        if (hasChanges) {
                            data.availability = normalized;
                            sessionStorage.setItem('glowbook_salon', JSON.stringify(data));
                            localStorage.setItem('glowbook_salon', JSON.stringify(data));
                            setTimeout(() => {
                                syncWithServer(normalized);
                            }, 50);
                        }
                        setInternalAvailability(normalized);
                    }
                    if (data.appointments) {
                        const mapped = data.appointments.map((apt: any) => {
                            const sDate = apt.start_time ? new Date(apt.start_time) : null;
                            if (!sDate || isNaN(sDate.getTime())) {
                                return {
                                    ...apt,
                                    id: apt.id,
                                    clientName: apt.customer_name || apt.customer_email || apt.clientName || 'Kund',
                                    clientEmail: apt.customer_email || apt.clientEmail || '',
                                    clientPhone: apt.customer_phone || apt.clientPhone || '',
                                    service: apt.service_name || apt.service || 'Tjänst',
                                    startTime: apt.startTime || '00:00',
                                    duration: apt.duration || apt.duration_minutes || 30,
                                    dayIndex: typeof apt.dayIndex === 'number' ? apt.dayIndex : 0,
                                    date: apt.date || '',
                                    status: apt.status || 'confirmed',
                                    color: 'bg-pink-100/95 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800/60 text-pink-800 dark:text-pink-300 shadow-sm'
                                };
                            }
                            
                            const pad = (n: number) => String(n).padStart(2, '0');
                            const startTime = `${pad(sDate.getHours())}:${pad(sDate.getMinutes())}`;
                            
                            let duration = 30;
                            if (apt.end_time) {
                                const eDate = new Date(apt.end_time);
                                if (!isNaN(eDate.getTime())) {
                                    duration = Math.round((eDate.getTime() - sDate.getTime()) / 60000);
                                }
                            } else if (apt.duration_minutes) {
                                duration = apt.duration_minutes;
                            }
                            
                            const day = sDate.getDay();
                            const dayIndex = day === 0 ? 6 : day - 1;
                            
                            return {
                                id: apt.id,
                                clientName: apt.customer_name || apt.customer_email || apt.clientName || 'Kund',
                                clientEmail: apt.customer_email || apt.clientEmail || '',
                                clientPhone: apt.customer_phone || apt.clientPhone || '',
                                service: apt.service_name || apt.service || 'Tjänst',
                                startTime: startTime,
                                duration: duration,
                                dayIndex: dayIndex,
                                date: format(sDate, 'yyyy-MM-dd'),
                                status: apt.status || 'confirmed',
                                start_time: apt.start_time,
                                end_time: apt.end_time,
                                color: 'bg-pink-100/95 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800/60 text-pink-800 dark:text-pink-300 shadow-sm'
                            };
                        });
                        setInternalAppointments(mapped.filter(Boolean));
                    }
                }
            } catch (error) {
                console.error("Error loading calendar data in Calendar.tsx:", error);
            }
        };

        loadData();
        window.addEventListener('storage', loadData);
        window.addEventListener('glowbook_update', loadData);

        // Fetch fresh salon details from server and update local state
        const refreshSalonData = async (salonId: string) => {
            try {
                const response = await fetch(`/api/salons/get?id=${salonId}&_t=${Date.now()}`);
                const resData = await response.json();
                if (isMounted && resData.success && resData.salon) {
                    const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
                    if (saved) {
                        const currentData = JSON.parse(saved);
                        // Optimize: Check if appointments or availability actually changed to prevent redundant rerenders & flickering
                        const currentApptsStr = JSON.stringify(currentData.appointments || []);
                        const serverApptsStr = JSON.stringify(resData.salon.appointments || []);
                        const currentAvailStr = JSON.stringify(currentData.availability || []);
                        const serverAvailStr = JSON.stringify(resData.salon.availability || []);

                        if (currentApptsStr === serverApptsStr && currentAvailStr === serverAvailStr) {
                            console.log('[SSE] No changes detected in appointments or availability. Skipping redraw.');
                            return;
                        }

                        const merged = {
                            ...currentData,
                            ...resData.salon,
                            availability: currentData.availability, // Preserve local availability during background updates to prevent race conditions & flickering
                            appointments: resData.salon.appointments || currentData.appointments
                        };
                        localStorage.setItem('glowbook_salon', JSON.stringify(merged));
                        sessionStorage.setItem('glowbook_salon', JSON.stringify(merged));
                        
                        // Force redraw
                        loadData();
                        window.dispatchEvent(new Event('glowbook_update'));
                    }
                }
            } catch (err) {
                console.error('[SSE] Failed to refresh salon data in calendar:', err);
            }
        };

        // Real-time synchronization
        const connectSSE = () => {
            const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
            if (!saved) return;
            try {
                const salon = JSON.parse(saved);
                if (!salon.id) return;

                eventSource = new EventSource(`/api/realtime/availability/stream?salonId=${salon.id}`);

                eventSource.onmessage = (event) => {
                    try {
                        const sseData = JSON.parse(event.data);
                        if (sseData.type === 'availability_update') {
                            console.log('[SSE] Provider calendar received availability update. Re-fetching data...');
                            refreshSalonData(salon.id);
                        }
                    } catch (e) {}
                };

                eventSource.onerror = (err) => {
                    if (isMounted) {
                        if (eventSource) {
                            eventSource.close();
                            eventSource = null;
                        }
                        retryTimeout = setTimeout(connectSSE, 5000);
                    }
                };
            } catch (e) {
                if (isMounted) {
                    retryTimeout = setTimeout(connectSSE, 5000);
                }
            }
        };

        connectSSE();

        return () => {
            isMounted = false;
            window.removeEventListener('storage', loadData);
            window.removeEventListener('glowbook_update', loadData);
            if (eventSource) {
                eventSource.close();
            }
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
        };
    }, []);

    const getLocale = () => {
        switch (language) {
            case 'Norska': return nb;
            case 'Danska': return da;
            case 'Finska': return fi;
            case 'Isländska': return is;
            default: return sv;
        }
    };

    const locale = getLocale();
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
        start: start,
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
    });

    const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00
    const PX_PER_HOUR = 64;

    const getItemStyle = (item: { startTime: string; duration: number }) => {
        const [hour, minute] = item.startTime.split(':').map(Number);
        const startHour = 6; // Matching new hours start
        const top = (hour - startHour) * PX_PER_HOUR + (minute / 60) * PX_PER_HOUR;
        const height = ((item.duration || 40) / 60) * PX_PER_HOUR;
        return { top: `${top}px`, height: `${height}px` };
    };

    const syncWithServer = async (updatedAvailability: TimeFrame[]) => {
        const saved = localStorage.getItem('glowbook_salon');
        if (!saved) return;
        const data = JSON.parse(saved);
        // Send only id and availability to optimize request size & speed
        const updatedData = { id: data.id, availability: updatedAvailability };

        try {
            await fetch('/api/salons/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
        } catch (e) {
            console.error('[Calendar] Failed to sync with server:', e);
        }
    };

    // Get appointments that overlap a given frame for a specific column date
    const getAppointmentsInFrame = useCallback((frame: TimeFrame, columnDate?: Date) => {
        const frameStart = timeToMins(frame.startTime);
        const frameEnd = frameStart + (frame.duration || 40);
        const columnDateStr = columnDate ? format(columnDate, 'yyyy-MM-dd') : null;

        return appointments.filter((aptRaw: any) => {
            const apt = aptRaw;
            if (apt.status === 'cancelled') return false;

            // Check practitioner overlap for multi-practitioner salons
            if (frame.practitionerId && frame.practitionerId !== 'any') {
                const aptPid = apt.practitioner_id || apt.practitionerId || 'owner';
                if (aptPid !== frame.practitionerId && aptPid !== 'any' && aptPid !== 'owner') {
                    return false;
                }
            }
            
            if (columnDateStr) {
                let aptDateStr = '';
                let aptStartMins = 0;
                let aptEndMins = 0;

                if (apt.start_time) {
                    const sDate = new Date(apt.start_time);
                    if (sDate && !isNaN(sDate.getTime())) {
                        aptDateStr = format(sDate, 'yyyy-MM-dd');
                        aptStartMins = sDate.getHours() * 60 + sDate.getMinutes();
                        if (apt.end_time) {
                            const eDate = new Date(apt.end_time);
                            if (eDate && !isNaN(eDate.getTime())) {
                                aptEndMins = eDate.getHours() * 60 + eDate.getMinutes();
                            } else {
                                aptEndMins = aptStartMins + (apt.duration || apt.duration_minutes || 60);
                            }
                        } else {
                            aptEndMins = aptStartMins + (apt.duration || apt.duration_minutes || 60);
                        }
                    } else {
                        aptDateStr = apt.date || '';
                        aptStartMins = timeToMins(apt.startTime || '00:00');
                        aptEndMins = aptStartMins + (apt.duration || 60);
                    }
                } else if (apt.booking_date) {
                    const bDate = new Date(apt.booking_date);
                    if (bDate && !isNaN(bDate.getTime())) {
                        aptDateStr = format(bDate, 'yyyy-MM-dd');
                    } else {
                        aptDateStr = apt.date || '';
                    }
                    aptStartMins = timeToMins(apt.startTime || '00:00');
                    aptEndMins = aptStartMins + (apt.duration || 60);
                } else if (apt.date) {
                    aptDateStr = apt.date;
                    aptStartMins = timeToMins(apt.startTime || '00:00');
                    aptEndMins = aptStartMins + (apt.duration || 60);
                } else {
                    if (apt.dayIndex !== frame.dayIndex) return false;
                    aptStartMins = timeToMins(apt.startTime || '00:00');
                    aptEndMins = aptStartMins + (apt.duration || 60);
                    aptDateStr = columnDateStr;
                }

                if (aptDateStr !== columnDateStr) return false;
                return aptStartMins < frameEnd && aptEndMins > frameStart;
            } else {
                if (apt.dayIndex !== frame.dayIndex) return false;
                const aptStart = timeToMins(apt.startTime);
                const aptEnd = aptStart + (apt.duration || 60);
                return aptStart < frameEnd && aptEnd > frameStart;
            }
        });
    }, [appointments]);

    // Split a frame into free/booked segments
    const getFrameSegments = useCallback((frame: TimeFrame, columnDate?: Date): FrameSegment[] => {
        const frameStart = timeToMins(frame.startTime);
        const frameEnd = frameStart + (frame.duration || 40);
        const overlapping = getAppointmentsInFrame(frame, columnDate);

        if (overlapping.length === 0) {
            return [{ start: frame.startTime, end: minsToTime(frameEnd), type: 'free' }];
        }

        // If 'Any' practitioner is selected, we only block the slot if ALL working practitioners are booked
        if (frame.practitionerIds && frame.practitionerIds.length > 0) {
            const bookedPids = overlapping.map((apt: any) => apt.practitioner_id || apt.practitionerId || 'owner');
            const allBooked = frame.practitionerIds.every(pid => bookedPids.includes(pid));
            if (!allBooked) {
                // Find the actual free practitioner and assign them to this frame
                const firstFreePid = frame.practitionerIds.find(pid => !bookedPids.includes(pid));
                if (firstFreePid) {
                    frame.practitionerId = firstFreePid;
                }
                
                // At least one qualified practitioner is free, so the slot remains free
                return [{ start: frame.startTime, end: minsToTime(frameEnd), type: 'free' }];
            }
        }

        // Sort appointments by start time
        const sorted = [...overlapping].sort((aRaw: any, bRaw: any) => {
            const a = aRaw; const b = bRaw;
            const aSDate = a.start_time ? new Date(a.start_time) : null;
            const bSDate = b.start_time ? new Date(b.start_time) : null;
            const aStart = aSDate && !isNaN(aSDate.getTime()) ? (aSDate.getHours() * 60 + aSDate.getMinutes()) : timeToMins(a.startTime || '00:00');
            const bStart = bSDate && !isNaN(bSDate.getTime()) ? (bSDate.getHours() * 60 + bSDate.getMinutes()) : timeToMins(b.startTime || '00:00');
            return aStart - bStart;
        });

        const segments: FrameSegment[] = [];
        let cursor = frameStart;

        for (const aptRaw of sorted) {
            const apt: any = aptRaw;
            const sDate = apt.start_time ? new Date(apt.start_time) : null;
            const eDate = apt.end_time ? new Date(apt.end_time) : null;
            const aptStart = sDate && !isNaN(sDate.getTime()) ? (sDate.getHours() * 60 + sDate.getMinutes()) : timeToMins(apt.startTime || '00:00');
            const aptEnd = eDate && !isNaN(eDate.getTime()) ? (eDate.getHours() * 60 + eDate.getMinutes()) : (aptStart + (apt.duration || 60));

            // Free gap before this appointment
            if (aptStart > cursor) {
                segments.push({
                    start: minsToTime(cursor),
                    end: minsToTime(aptStart),
                    type: 'free'
                });
            }

            // Booked segment
            segments.push({
                start: minsToTime(Math.max(aptStart, frameStart)),
                end: minsToTime(Math.min(aptEnd, frameEnd)),
                type: 'booked',
                appointment: apt
            });

            cursor = Math.max(cursor, aptEnd);
        }

        // Free gap after last appointment
        if (cursor < frameEnd) {
            segments.push({
                start: minsToTime(cursor),
                end: minsToTime(frameEnd),
                type: 'free'
            });
        }

        return segments;
    }, [getAppointmentsInFrame]);

    // Handle clicking on a frame to edit
    const handleFrameClick = (frame: TimeFrame, e: React.MouseEvent, columnDate?: Date) => {
        e.stopPropagation();
        // If clicking in customer booking mode, select the slot
        if (onSelectSlot && hideAppointments) {
            const day = columnDate || weekDays[frame.dayIndex];
            if (day) {
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const dayStr = format(day, 'yyyy-MM-dd');
                if (dayStr < todayStr) return; // Prevent selection of past dates
                onSelectSlot(format(day, 'yyyy-MM-dd'), frame.startTime, (frame as any).practitionerId);
            }
            return;
        }

        const segments = getFrameSegments(frame, columnDate);
        setEditingFrame({ frame, dayIndex: frame.dayIndex, segments });
        setAddingSlot(null);
    };

    // Handle clicking empty slot to add new time
    const handleEmptySlotClick = (dayIndex: number, hour: number, day: Date) => {
        if (hideAppointments) return;
        setAddingSlot({ dayIndex, hour, date: day });
        setNewSlotTimes({ from: `${String(hour).padStart(2, '0')}:00`, to: `${String(Math.min(hour + 4, 21)).padStart(2, '0')}:00` });
        setApplyToAllWeeks(true);
        setEditingFrame(null);
    };

    // Remove a free segment from a frame (split the frame around booked parts)
    const removeSegment = async (frame: TimeFrame, segStart: string, segEnd: string) => {
        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        if (!saved) return;
        const data = JSON.parse(saved);
        const frames: TimeFrame[] = data.availability || [];

        const frameStart = timeToMins(frame.startTime);
        const frameEnd = frameStart + (frame.duration || 40);
        const removeStart = timeToMins(segStart);
        const removeEnd = timeToMins(segEnd);

        // Remove the original frame
        const remaining = frames.filter(f => String(f.id) !== String(frame.id));

        // Add back the parts that remain (before and after the removed segment)
        if (removeStart > frameStart) {
            remaining.push({
                id: Date.now().toString() + '-before',
                startTime: frame.startTime,
                duration: removeStart - frameStart,
                dayIndex: frame.dayIndex
            });
        }
        if (removeEnd < frameEnd) {
            remaining.push({
                id: Date.now().toString() + '-after',
                startTime: minsToTime(removeEnd),
                duration: frameEnd - removeEnd,
                dayIndex: frame.dayIndex
            });
        }

        data.availability = remaining;
        localStorage.setItem('glowbook_salon', JSON.stringify(data));
        sessionStorage.setItem('glowbook_salon', JSON.stringify(data));
        
        // Optimistic update
        setInternalAvailability(remaining);
        setEditingFrame(null);

        await syncWithServer(remaining);
        window.dispatchEvent(new Event('glowbook_update'));
    };

    // Delete the entire frame (only if no bookings)
    const deleteFrame = async (frame: TimeFrame) => {
        const overlapping = getAppointmentsInFrame(frame);
        if (overlapping.length > 0) {
            setConflictWarning(`Kan inte ta bort — det finns ${overlapping.length} bokning(ar) i detta tidsblock. Avboka dem först.`);
            return;
        }

        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        if (!saved) return;
        const data = JSON.parse(saved);
        const updatedAvailability = (data.availability || []).filter((f: any) => String(f.id) !== String(frame.id));
        data.availability = updatedAvailability;
        localStorage.setItem('glowbook_salon', JSON.stringify(data));
        sessionStorage.setItem('glowbook_salon', JSON.stringify(data));
        
        // Optimistic update
        setInternalAvailability(updatedAvailability);
        setEditingFrame(null);

        await syncWithServer(updatedAvailability);
        window.dispatchEvent(new Event('glowbook_update'));
    };

    // Update frame times (with booking protection)
    const updateFrameTimes = async (frame: TimeFrame, newStart: string, newEnd: string) => {
        const newStartMins = timeToMins(newStart);
        const newEndMins = timeToMins(newEnd);
        const newDuration = newEndMins - newStartMins;

        if (newDuration <= 0) {
            setConflictWarning("Sluttid måste vara efter starttid.");
            return;
        }

        // Check if any booking falls outside the new range
        const overlapping = getAppointmentsInFrame(frame);
        for (const apt of overlapping) {
            const aptStart = timeToMins(apt.startTime);
            const aptEnd = aptStart + apt.duration;
            if (aptStart < newStartMins || aptEnd > newEndMins) {
                setConflictWarning(`Kan inte ändra — bokningen "${apt.service}" (${apt.startTime}) faller utanför det nya intervallet.`);
                return;
            }
        }

        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        if (!saved) return;
        const data = JSON.parse(saved);
        const frames: TimeFrame[] = data.availability || [];
        const idx = frames.findIndex(f => String(f.id) === String(frame.id));
        if (idx !== -1) {
            frames[idx] = { ...frames[idx], startTime: newStart, duration: newDuration };
            data.availability = frames;
            localStorage.setItem('glowbook_salon', JSON.stringify(data));
            sessionStorage.setItem('glowbook_salon', JSON.stringify(data));
            
            // Optimistic update
            setInternalAvailability(frames);
            const updatedFrame = frames[idx];
            const segments = getFrameSegments(updatedFrame);
            setEditingFrame({ frame: updatedFrame, dayIndex: updatedFrame.dayIndex, segments });

            await syncWithServer(frames);
            window.dispatchEvent(new Event('glowbook_update'));
        }
    };

    // Add new availability slot
    const addNewSlot = async () => {
        if (!addingSlot) return;
        const fromMins = timeToMins(newSlotTimes.from);
        const toMins = timeToMins(newSlotTimes.to);
        const duration = toMins - fromMins;

        if (duration <= 0) {
            setConflictWarning("Sluttid måste vara efter starttid.");
            return;
        }

        const newFrame: TimeFrame = {
            id: Date.now().toString(),
            startTime: newSlotTimes.from,
            duration: duration,
            dayIndex: addingSlot.dayIndex,
            ...(!applyToAllWeeks && { week: format(startOfWeek(addingSlot.date, { weekStartsOn: 1 }), 'yyyy-MM-dd') })
        };

        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        const data = saved ? JSON.parse(saved) : {};
        const updatedAvailability = [...(data.availability || []), newFrame];
        data.availability = updatedAvailability;
        localStorage.setItem('glowbook_salon', JSON.stringify(data));
        sessionStorage.setItem('glowbook_salon', JSON.stringify(data));
        
        // Optimistic update
        setInternalAvailability(updatedAvailability);
        setAddingSlot(null);

        await syncWithServer(updatedAvailability);
        window.dispatchEvent(new Event('glowbook_update'));
    };

    const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
    const nextWeek = () => setCurrentDate(addDays(currentDate, 7));

    return (
        <div className="bg-card rounded-xl shadow-sm border border-border flex flex-col h-full min-h-[600px] transition-colors duration-300 relative">
            {/* Calendar Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-foreground capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale })}
                    </h2>
                    <p className="text-sm text-foreground/50">
                        {t('cal_week')} {format(currentDate, 'w', { locale })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={prevWeek} 
                        disabled={hideAppointments && startOfWeek(currentDate, { weekStartsOn: 1 }) <= startOfWeek(new Date(), { weekStartsOn: 1 })}
                        className={clsx(
                            "p-2 rounded-lg text-foreground/50 transition-colors",
                            hideAppointments && startOfWeek(currentDate, { weekStartsOn: 1 }) <= startOfWeek(new Date(), { weekStartsOn: 1 })
                                ? "opacity-30 cursor-not-allowed"
                                : "hover:bg-foreground/5"
                        )}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-medium bg-foreground/10 text-foreground rounded-lg hover:bg-foreground/20 transition-colors border border-border">
                        {t('cal_today')}
                    </button>
                    <button onClick={nextWeek} className="p-2 hover:bg-foreground/5 rounded-lg text-foreground/50 transition-colors"><ChevronRight size={20} /></button>
                </div>
            </div>

            {/* Conflict Warning */}
            <AnimatePresence>
                {conflictWarning && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
                            <ShieldAlert size={16} className="text-red-500 shrink-0" />
                            <p className="text-[11px] font-bold text-red-500 flex-1">{conflictWarning}</p>
                            <button onClick={() => setConflictWarning(null)} className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shrink-0">OK</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto no-scrollbar scroll-smooth">
                <div className="flex min-w-[600px] md:min-w-[800px] relative">
                    {/* Time Column with Sticky Header */}
                    <div className="w-12 md:w-16 flex-shrink-0 border-r border-border bg-background transition-colors flex flex-col sticky left-0 z-30">
                        <div className="h-[68px] border-b border-border sticky top-0 z-20 bg-background" />
                        <div className="relative bg-background">
                            {hours.map(hour => (
                                <div key={hour} className="h-16 flex items-start justify-center text-[10px] font-bold text-foreground/20 pt-1 border-b border-border/10">
                                    {String(hour).padStart(2, '0')}:00
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Days Columns */}
                    <div className="flex-1 grid grid-cols-7 divide-x divide-border transition-colors">
                        {weekDays.map((day, dayIndex) => (
                            <div key={day.toString()} className="relative">
                                {/* Day Header */}
                                <div className={clsx(
                                    "text-center py-2 border-b border-border sticky top-0 z-10 transition-colors h-[68px]",
                                    format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "bg-foreground/5" : "bg-card"
                                )}>
                                    <div className="text-xs font-medium text-foreground/40 uppercase">
                                        {format(day, 'EEE', { locale })}
                                    </div>
                                    <div className={clsx(
                                        "text-lg font-bold w-8 h-8 flex items-center justify-center mx-auto rounded-full mt-1 transition-all",
                                        format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "bg-[#111] dark:bg-white text-white dark:text-[#111]" : "text-foreground"
                                    )}>
                                        {format(day, 'd')}
                                    </div>
                                </div>

                                {/* Day Slots */}
                                <div className="relative h-[832px]"> {/* 13 hours * 64px */}
                                    {/* Grid Lines — clickable to add new slot */}
                                    {hours.map((hour, i) => (
                                        <div
                                            key={hour}
                                            onClick={() => !hideAppointments && handleEmptySlotClick(dayIndex, hour, day)}
                                            className={clsx(
                                                "absolute w-full h-16 border-b border-border/60 transition-all",
                                                !hideAppointments && "hover:bg-emerald-500/[0.05] cursor-pointer group/grid"
                                            )}
                                            style={{ top: `${i * PX_PER_HOUR}px` }}
                                        >
                                            {/* "+" hint on hover */}
                                            {!hideAppointments && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/grid:opacity-100 transition-opacity pointer-events-none">
                                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                        <Plus size={10} className="text-emerald-500" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && (
                                        <div className="absolute inset-0 bg-blue-500/[0.03] pointer-events-none" />
                                    )}

                                    {/* Availability Frames — split into segments */}
                                    {availability.filter(frame => {
                                        if (frame.dayIndex !== dayIndex) return false;

                                        const dayStr = format(day, 'yyyy-MM-dd');
                                        if ((frame as any).date && (frame as any).date !== dayStr) return false;

                                        const weekStartStr = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                                        if ((frame as any).week && (frame as any).week !== weekStartStr) return false;

                                        if (hideAppointments) {
                                            const todayStr = format(new Date(), 'yyyy-MM-dd');
                                            const dayStr = format(day, 'yyyy-MM-dd');
                                            if (dayStr < todayStr) return false;
                                            
                                            // Extra bulletproof check: if today, filter out individual frames that are already in the past
                                            if (dayStr === todayStr) {
                                                const [frameHour, frameMin] = frame.startTime.split(':').map(Number);
                                                const frameMins = frameHour * 60 + frameMin;
                                                const now = new Date();
                                                const currentMins = now.getHours() * 60 + now.getMinutes();
                                                if (frameMins < currentMins + 15) return false;
                                            }

                                            // THE FIX: Hide completely if it overlaps with ANY appointment for THIS DAY
                                            const overlapping = getAppointmentsInFrame(frame, day);
                                            if (overlapping.length > 0) return false;
                                        }
                                        return true;
                                    }).map(frame => {
                                        const segments = getFrameSegments(frame, day);
                                        const isEditing = editingFrame && String(editingFrame.frame.id) === String(frame.id);
                                        const hasBookings = segments.some(s => s.type === 'booked');
                                        const frameStartMins = timeToMins(frame.startTime);
                                        const frameEndMins = frameStartMins + (frame.duration || 40);
                                        const freeSegments = segments.filter(s => s.type === 'free');
                                        let labelTopMins = frameStartMins + (frame.duration || 40) / 2;
                                        if (freeSegments.length > 0) {
                                            const largest = freeSegments.reduce((prev, curr) => {
                                                const prevDur = timeToMins(prev.end) - timeToMins(prev.start);
                                                const currDur = timeToMins(curr.end) - timeToMins(curr.start);
                                                return currDur > prevDur ? curr : prev;
                                            });
                                            labelTopMins = timeToMins(largest.start) + (timeToMins(largest.end) - timeToMins(largest.start)) / 2;
                                        }
                                        const labelTopPx = ((labelTopMins - frameStartMins) / 60) * PX_PER_HOUR;

                                        return (
                                            <div key={frame.id}>
                                                {/* Full frame outline */}
                                                <div
                                                    onClick={(e) => handleFrameClick(frame, e, day)}
                                                    className={clsx(
                                                        "group/frame absolute inset-x-0.5 rounded-lg z-[5] cursor-pointer transition-all",
                                                        isEditing
                                                            ? "ring-2 ring-emerald-400 ring-offset-1 ring-offset-background shadow-xl shadow-emerald-500/20 z-[15]"
                                                            : "hover:shadow-lg hover:z-10"
                                                    )}
                                                    style={getItemStyle(frame)}
                                                >
                                                    {/* Render segments inside the frame */}
                                                    {segments.map((seg, si) => {
                                                        const segStartMins = timeToMins(seg.start);
                                                        const segEndMins = timeToMins(seg.end);
                                                        const segTopPx = ((segStartMins - frameStartMins) / 60) * PX_PER_HOUR;
                                                        const segHeightPx = ((segEndMins - segStartMins) / 60) * PX_PER_HOUR;

                                                        if (seg.type === 'booked') {
                                                            return (
                                                                <div
                                                                    key={si}
                                                                    className="absolute inset-x-0 bg-pink-100/90 dark:bg-pink-950/40 border-y border-pink-300 dark:border-pink-800/60 overflow-hidden"
                                                                    style={{ top: `${segTopPx}px`, height: `${segHeightPx}px` }}
                                                                    title={`Bokad: ${seg.appointment?.clientName} — ${seg.appointment?.service}`}
                                                                >
                                                                    <div className="px-2 py-1.5 flex flex-col h-full relative z-[1]">
                                                                        <div className="flex items-center justify-between mb-0.5">
                                                                            <span className="font-black text-[9px] uppercase tracking-wider text-pink-900 dark:text-pink-200">
                                                                                {seg.appointment?.service || 'Bokad'}
                                                                            </span>
                                                                            <span className="text-[8px] font-bold text-pink-600/70 dark:text-pink-400/70">
                                                                                {seg.start}
                                                                            </span>
                                                                        </div>
                                                                        <div className="font-bold truncate text-[10px] text-pink-850 dark:text-pink-100">
                                                                            {seg.appointment?.clientName || 'Kund (namn saknas)'}
                                                                        </div>
                                                                        {seg.appointment?.clientEmail && (
                                                                            <div className="text-[8px] text-pink-800/80 dark:text-pink-200/80 truncate font-medium mt-0.5">
                                                                                {seg.appointment.clientEmail}
                                                                            </div>
                                                                        )}
                                                                        {seg.appointment?.clientPhone && seg.appointment.clientPhone !== '-' && (
                                                                            <div className="text-[8px] text-pink-800/80 dark:text-pink-200/80 truncate font-medium mt-0.5">
                                                                                📞 {seg.appointment.clientPhone}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div
                                                                key={si}
                                                                className={clsx(
                                                                    "absolute inset-x-0 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent transition-all group-hover/frame:from-emerald-500/30",
                                                                    si === 0 && "rounded-t-lg",
                                                                    si === segments.length - 1 && "rounded-b-lg"
                                                                )}
                                                                style={{ top: `${segTopPx}px`, height: `${segHeightPx}px` }}
                                                            >
                                                                {/* Shine effect for each segment */}
                                                                <div className="absolute inset-0 opacity-0 group-hover/frame:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/frame:translate-x-full duration-1000 transform skew-x-12" />
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Frame border & label */}
                                                    <div className={clsx(
                                                        "absolute inset-0 rounded-lg border-2 pointer-events-none",
                                                        hasBookings ? "border-emerald-500/30" : "border-emerald-500/50"
                                                    )} />
                                                    
                                                    {/* Frame label */}
                                                    <div 
                                                        className="absolute inset-x-0 flex items-center justify-center pointer-events-none transition-all duration-300"
                                                        style={{ top: `${labelTopPx}px`, transform: 'translateY(-50%)' }}
                                                    >
                                                        {!isEditing && !hasBookings && (
                                                            <div className={clsx(
                                                                "text-[10px] font-black px-3 py-1 rounded-full shadow-2xl uppercase tracking-[0.15em] border border-emerald-400/30 transition-all group-hover/frame:scale-110",
                                                                "bg-emerald-600 text-white"
                                                            )}>
                                                                {frame.startTime} – {minsToTime(frameEndMins)}
                                                            </div>
                                                        )}
                                                        {isEditing && (
                                                            <div className="bg-emerald-600 text-white text-[9px] font-black px-4 py-2 rounded-full shadow-2xl uppercase tracking-[0.2em] animate-pulse border-2 border-white/20">
                                                                Ändrar...
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Appointments — Always rendered on top (provider view) */}
                                    {!hideAppointments && appointments.filter(apt => {
                                        if (apt.status === 'cancelled') return false;
                                        if (apt.dayIndex !== dayIndex) return false;
                                        
                                        const columnDateStr = format(day, 'yyyy-MM-dd');
                                        let aptDateStr = '';
                                        if (apt.date) {
                                            aptDateStr = apt.date;
                                        } else if (apt.start_time) {
                                            const sDate = new Date(apt.start_time);
                                            if (sDate && !isNaN(sDate.getTime())) {
                                                aptDateStr = format(sDate, 'yyyy-MM-dd');
                                            }
                                        } else if (apt.booking_date) {
                                            const bDate = new Date(apt.booking_date);
                                            if (bDate && !isNaN(bDate.getTime())) {
                                                aptDateStr = format(bDate, 'yyyy-MM-dd');
                                            }
                                        }
                                        
                                        if (aptDateStr && aptDateStr !== columnDateStr) return false;
                                        return true;
                                    }).map(apt => (
                                        <div
                                            key={apt.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewingAppointment(apt);
                                            }}
                                            className={clsx(
                                                "absolute inset-x-1 rounded-lg border p-2 text-[10px] cursor-pointer hover:shadow-md transition-all z-[25] overflow-hidden flex flex-col justify-between",
                                                "bg-pink-100/95 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800/60 text-pink-800 dark:text-pink-300 shadow-sm"
                                            )}
                                            style={getItemStyle(apt)}
                                            title={`Kund: ${apt.clientName}\nEmail: ${apt.clientEmail || '-'}\nTel: ${apt.clientPhone || '-'}\nTjänst: ${apt.service}`}
                                        >
                                            <div className="space-y-0.5">
                                                <div className="font-black truncate text-[9px] uppercase tracking-wider text-pink-900 dark:text-pink-200">
                                                    {apt.service}
                                                </div>
                                                <div className="font-bold truncate text-[10px] text-pink-850 dark:text-pink-100">
                                                    {apt.clientName}
                                                </div>
                                                {apt.clientEmail && (
                                                    <div className="text-[8px] opacity-75 truncate font-medium">
                                                        {apt.clientEmail}
                                                    </div>
                                                )}
                                                {apt.clientPhone && apt.clientPhone !== '-' && (
                                                    <div className="text-[8px] opacity-75 truncate font-medium">
                                                        📞 {apt.clientPhone}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-[8px] font-black text-pink-600/60 dark:text-pink-400/50 text-right mt-1 shrink-0">
                                                {apt.startTime} ({apt.duration} min)
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Editing Panel (Luxurious Center Modal with Backdrop Blur) */}
            <AnimatePresence>
                {editingFrame && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingFrame(null)}
                            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[90]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] sm:w-[420px] bg-card border border-border shadow-2xl rounded-3xl z-[100] flex flex-col overflow-hidden max-h-[85vh]"
                        >
                            {/* Panel header */}
                            <div className="p-4 border-b border-border bg-foreground/[0.02] flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-sm font-black text-foreground">Redigera tidsblock</h3>
                                    <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-0.5">
                                        {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'][editingFrame.dayIndex]}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingFrame(null)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Panel content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Time inputs */}
                                <div className="bg-foreground/[0.02] rounded-2xl p-4 border border-border space-y-3">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 flex items-center gap-1.5">
                                        <Clock size={10} /> Tidsintervall
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[8px] font-bold text-foreground/30 uppercase tracking-widest mb-1 block">Från</label>
                                            <input
                                                type="time"
                                                lang="sv-SE"
                                                value={editingFrame.frame.startTime}
                                                onChange={(e) => {
                                                    const end = minsToTime(timeToMins(editingFrame.frame.startTime) + (editingFrame.frame.duration || 40));
                                                    updateFrameTimes(editingFrame.frame, e.target.value, end);
                                                }}
                                                className="w-full p-2.5 bg-background border border-border rounded-xl font-bold text-sm text-foreground focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-bold text-foreground/30 uppercase tracking-widest mb-1 block">Till</label>
                                            <input
                                                type="time"
                                                lang="sv-SE"
                                                value={minsToTime(timeToMins(editingFrame.frame.startTime) + (editingFrame.frame.duration || 40))}
                                                onChange={(e) => {
                                                    updateFrameTimes(editingFrame.frame, editingFrame.frame.startTime, e.target.value);
                                                }}
                                                className="w-full p-2.5 bg-background border border-border rounded-xl font-bold text-sm text-foreground focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Segments breakdown */}
                                <div className="space-y-2">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 flex items-center gap-1.5 px-1">
                                        <Edit3 size={10} /> Delar i detta block
                                    </h4>
                                    {editingFrame.segments.map((seg, si) => {
                                        const segDuration = timeToMins(seg.end) - timeToMins(seg.start);
                                        const segHours = Math.floor(segDuration / 60);
                                        const segMins = segDuration % 60;

                                        if (seg.type === 'booked') {
                                            return (
                                                <div key={si} className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarCheck size={12} className="text-rose-500 shrink-0" />
                                                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Bokad</span>
                                                        <span className="text-[10px] font-black text-rose-400/60 uppercase tracking-wider ml-auto">🔒</span>
                                                    </div>
                                                    <div className="text-[11px] font-bold text-foreground/70">{seg.start} – {seg.end}</div>
                                                    {seg.appointment && (
                                                        <div className="text-[10px] text-foreground/40 font-bold">
                                                            {seg.appointment.clientName} — {seg.appointment.service}
                                                        </div>
                                                    )}
                                                    <p className="text-[8px] text-rose-400/60 italic font-medium">Bokad tid — kan avbokas via bokningsdetaljerna</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={si} className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Ledig</span>
                                                    </div>
                                                    <span className="text-[9px] text-foreground/30 font-bold">
                                                        {segHours > 0 ? `${segHours}h` : ''}{segMins > 0 ? `${segMins}m` : ''}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] font-bold text-foreground/70">{seg.start} – {seg.end}</div>
                                                <button
                                                    onClick={() => removeSegment(editingFrame.frame, seg.start, seg.end)}
                                                    className="w-full py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                                >
                                                    <Trash2 size={10} />
                                                    Ta bort denna tid
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Panel footer */}
                            <div className="p-4 border-t border-border space-y-3 shrink-0 bg-foreground/[0.01]">
                                {editingFrame.segments.every(s => s.type === 'free') && (
                                    <button
                                        onClick={() => deleteFrame(editingFrame.frame)}
                                        className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <Trash2 size={14} />
                                        Ta bort hela blocket
                                    </button>
                                )}
                                <button
                                    onClick={() => setEditingFrame(null)}
                                    className="w-full py-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold text-xs transition-all active:scale-95"
                                >
                                    Klar
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Add New Slot Panel (Luxurious Center Modal with Backdrop Blur) */}
            <AnimatePresence>
                {addingSlot && !hideAppointments && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setAddingSlot(null)}
                            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[90]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] sm:w-96 bg-card border border-border shadow-2xl rounded-3xl z-[100] flex flex-col overflow-hidden max-h-[85vh]"
                        >
                            <div className="p-4 border-b border-border bg-foreground/[0.02] flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                                        <Plus size={14} className="text-emerald-500" /> Lägg till tid
                                    </h3>
                                    <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-0.5">
                                        {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'][addingSlot.dayIndex]} {format(addingSlot.date, 'd MMMM', { locale })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setAddingSlot(null)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-1.5">
                                        <Clock size={10} /> Ny tillgänglig tid
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[8px] font-bold text-foreground/30 uppercase tracking-widest mb-1 block">Från</label>
                                            <input
                                                type="time"
                                                lang="sv-SE"
                                                value={newSlotTimes.from}
                                                onChange={(e) => setNewSlotTimes(prev => ({ ...prev, from: e.target.value }))}
                                                className="w-full p-2.5 bg-background border border-border rounded-xl font-bold text-sm text-foreground focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-bold text-foreground/30 uppercase tracking-widest mb-1 block">Till</label>
                                            <input
                                                type="time"
                                                lang="sv-SE"
                                                value={newSlotTimes.to}
                                                onChange={(e) => setNewSlotTimes(prev => ({ ...prev, to: e.target.value }))}
                                                className="w-full p-2.5 bg-background border border-border rounded-xl font-bold text-sm text-foreground focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    {timeToMins(newSlotTimes.to) > timeToMins(newSlotTimes.from) && (
                                        <div className="text-[10px] text-emerald-500 font-bold text-center pt-1">
                                            {Math.floor((timeToMins(newSlotTimes.to) - timeToMins(newSlotTimes.from)) / 60)}h {(timeToMins(newSlotTimes.to) - timeToMins(newSlotTimes.from)) % 60}min tillgänglig
                                        </div>
                                    )}
                                </div>
                                
                                <div className="bg-foreground/[0.02] border border-border rounded-2xl p-4 flex items-center justify-between cursor-pointer" onClick={() => setApplyToAllWeeks(!applyToAllWeeks)}>
                                    <div>
                                        <h4 className="text-xs font-bold text-foreground">Upprepa varje vecka</h4>
                                        <p className="text-[10px] text-foreground/50">Gäller för alla framtida veckor</p>
                                    </div>
                                    <div className={clsx("w-10 h-6 rounded-full flex items-center p-1 transition-colors", applyToAllWeeks ? "bg-emerald-500" : "bg-foreground/20")}>
                                        <div className={clsx("w-4 h-4 rounded-full bg-white transition-transform shadow-sm", applyToAllWeeks ? "translate-x-4" : "translate-x-0")} />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-border space-y-3 shrink-0 bg-foreground/[0.01]">
                                <button
                                    onClick={addNewSlot}
                                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                                >
                                    <Plus size={14} />
                                    Lägg till tid
                                </button>
                                <button
                                    onClick={() => setAddingSlot(null)}
                                    className="w-full py-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold text-xs transition-all active:scale-95"
                                >
                                    Avbryt
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Viewing / Cancelling Appointment Modal (Stunning Premium Drawer/Modal for mobile compatibility) */}
            <AnimatePresence>
                {viewingAppointment && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setViewingAppointment(null)}
                            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[90]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] sm:w-96 bg-card border border-border shadow-2xl rounded-3xl z-[100] flex flex-col overflow-hidden max-h-[85vh]"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-border bg-foreground/[0.02] flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-sm font-black text-foreground">Bokningsdetaljer</h3>
                                    <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-0.5">
                                        Kundbesök
                                    </p>
                                </div>
                                <button
                                    onClick={() => setViewingAppointment(null)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30">Kund</span>
                                    <div className="text-lg font-black text-foreground">{viewingAppointment.clientName}</div>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30">Tjänst</span>
                                    <div className="text-sm font-bold text-foreground">{viewingAppointment.service}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30">Tid</span>
                                        <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                            <Clock size={14} className="text-emerald-500" />
                                            {viewingAppointment.startTime} ({viewingAppointment.duration} min)
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30">Dag</span>
                                        <div className="text-sm font-bold text-foreground">
                                            {['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'][viewingAppointment.dayIndex]}
                                        </div>
                                    </div>
                                </div>

                                {(viewingAppointment.clientEmail || viewingAppointment.clientPhone) && (
                                    <div className="p-4 rounded-2xl bg-foreground/[0.02] border border-border space-y-2.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30 block">Kontaktuppgifter</span>
                                        {viewingAppointment.clientEmail && (
                                            <div className="text-xs text-foreground/70 flex items-center gap-2 truncate">
                                                <span className="text-blue-500 font-bold">✉</span> {viewingAppointment.clientEmail}
                                            </div>
                                        )}
                                        {viewingAppointment.clientPhone && (
                                            <div className="text-xs text-foreground/70 flex items-center gap-2">
                                                <span className="text-emerald-500 font-bold">📞</span> {viewingAppointment.clientPhone}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-border space-y-3 shrink-0 bg-foreground/[0.01]">
                                <button
                                    onClick={() => {
                                        if (onCancelAppointment) {
                                            onCancelAppointment(viewingAppointment.id);
                                        }
                                        setViewingAppointment(null);
                                    }}
                                    className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 active:scale-95"
                                >
                                    <Trash2 size={14} />
                                    Avboka denna bokning
                                </button>
                                <button
                                    onClick={() => setViewingAppointment(null)}
                                    className="w-full py-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold text-xs transition-all active:scale-95"
                                >
                                    Stäng
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
