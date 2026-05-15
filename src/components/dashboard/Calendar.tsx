
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
};

type CalendarProps = {
    onSelectSlot?: (date: string, startTime: string, practitionerId?: string) => void;
    onCancelAppointment?: (appointmentId: string) => void;
    availability?: TimeFrame[];
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

export default function Calendar({ onSelectSlot, onCancelAppointment, availability: propAvailability, hideAppointments = false }: CalendarProps) {
    const { language, t } = useLanguage();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [internalAvailability, setInternalAvailability] = useState<TimeFrame[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [editingFrame, setEditingFrame] = useState<EditingFrame | null>(null);
    const [addingSlot, setAddingSlot] = useState<{ dayIndex: number; hour: number; date: Date } | null>(null);
    const [newSlotTimes, setNewSlotTimes] = useState({ from: '09:00', to: '17:00' });
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);

    const availability = propAvailability || internalAvailability;

    // Load data on mount and listen for changes
    useEffect(() => {
        const loadData = () => {
            const saved = sessionStorage.getItem('glowbook_salon');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.availability) setInternalAvailability(data.availability);
                if (data.appointments) setAppointments(data.appointments);
            }
        };

        loadData();
        window.addEventListener('storage', loadData);
        window.addEventListener('glowbook_update', loadData);

        return () => {
            window.removeEventListener('storage', loadData);
            window.removeEventListener('glowbook_update', loadData);
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
        const height = (item.duration / 60) * PX_PER_HOUR;
        return { top: `${top}px`, height: `${height}px` };
    };

    const syncWithServer = async (updatedAvailability: TimeFrame[]) => {
        const saved = localStorage.getItem('glowbook_salon');
        if (!saved) return;
        const data = JSON.parse(saved);
        const updatedData = { ...data, availability: updatedAvailability };

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

    // Get appointments that overlap a given frame
    const getAppointmentsInFrame = useCallback((frame: TimeFrame) => {
        const frameStart = timeToMins(frame.startTime);
        const frameEnd = frameStart + frame.duration;
        return appointments.filter(apt => {
            if (apt.dayIndex !== frame.dayIndex) return false;
            if (apt.status === 'cancelled') return false;
            const aptStart = timeToMins(apt.startTime);
            const aptEnd = aptStart + apt.duration;
            return aptStart < frameEnd && aptEnd > frameStart;
        });
    }, [appointments]);

    // Split a frame into free/booked segments
    const getFrameSegments = useCallback((frame: TimeFrame): FrameSegment[] => {
        const frameStart = timeToMins(frame.startTime);
        const frameEnd = frameStart + frame.duration;
        const overlapping = getAppointmentsInFrame(frame);

        if (overlapping.length === 0) {
            return [{ start: frame.startTime, end: minsToTime(frameEnd), type: 'free' }];
        }

        // Sort appointments by start time
        const sorted = [...overlapping].sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));

        const segments: FrameSegment[] = [];
        let cursor = frameStart;

        for (const apt of sorted) {
            const aptStart = timeToMins(apt.startTime);
            const aptEnd = aptStart + apt.duration;

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
    const handleFrameClick = (frame: TimeFrame, e: React.MouseEvent) => {
        e.stopPropagation();
        // If clicking in customer booking mode, select the slot
        if (onSelectSlot && hideAppointments) {
            const day = weekDays[frame.dayIndex];
            if (day) onSelectSlot(format(day, 'yyyy-MM-dd'), frame.startTime, (frame as any).practitionerId);
            return;
        }

        const segments = getFrameSegments(frame);
        setEditingFrame({ frame, dayIndex: frame.dayIndex, segments });
        setAddingSlot(null);
    };

    // Handle clicking empty slot to add new time
    const handleEmptySlotClick = (dayIndex: number, hour: number, day: Date) => {
        if (onSelectSlot && hideAppointments) {
            onSelectSlot(format(day, 'yyyy-MM-dd'), `${String(hour).padStart(2, '0')}:00`, undefined);
            return;
        }
        setAddingSlot({ dayIndex, hour, date: day });
        setNewSlotTimes({ from: `${String(hour).padStart(2, '0')}:00`, to: `${String(Math.min(hour + 4, 21)).padStart(2, '0')}:00` });
        setEditingFrame(null);
    };

    // Remove a free segment from a frame (split the frame around booked parts)
    const removeSegment = (frame: TimeFrame, segStart: string, segEnd: string) => {
        const saved = localStorage.getItem('glowbook_salon');
        if (!saved) return;
        const data = JSON.parse(saved);
        const frames: TimeFrame[] = data.availability || [];

        const frameStart = timeToMins(frame.startTime);
        const frameEnd = frameStart + frame.duration;
        const removeStart = timeToMins(segStart);
        const removeEnd = timeToMins(segEnd);

        // Remove the original frame
        const remaining = frames.filter(f => f.id !== frame.id);

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
        syncWithServer(remaining);
        window.dispatchEvent(new Event('glowbook_update'));
        setEditingFrame(null);
    };

    // Delete the entire frame (only if no bookings)
    const deleteFrame = (frame: TimeFrame) => {
        const overlapping = getAppointmentsInFrame(frame);
        if (overlapping.length > 0) {
            setConflictWarning(`Kan inte ta bort — det finns ${overlapping.length} bokning(ar) i detta tidsblock. Avboka dem först.`);
            return;
        }

        const saved = localStorage.getItem('glowbook_salon');
        if (!saved) return;
        const data = JSON.parse(saved);
        const updatedAvailability = (data.availability || []).filter((f: any) => f.id !== frame.id);
        data.availability = updatedAvailability;
        localStorage.setItem('glowbook_salon', JSON.stringify(data));
        syncWithServer(updatedAvailability);
        window.dispatchEvent(new Event('glowbook_update'));
        setEditingFrame(null);
    };

    // Update frame times (with booking protection)
    const updateFrameTimes = (frame: TimeFrame, newStart: string, newEnd: string) => {
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

        const saved = localStorage.getItem('glowbook_salon');
        if (!saved) return;
        const data = JSON.parse(saved);
        const frames: TimeFrame[] = data.availability || [];
        const idx = frames.findIndex(f => f.id === frame.id);
        if (idx !== -1) {
            frames[idx] = { ...frames[idx], startTime: newStart, duration: newDuration };
            data.availability = frames;
            localStorage.setItem('glowbook_salon', JSON.stringify(data));
            syncWithServer(frames);
            window.dispatchEvent(new Event('glowbook_update'));

            // Update editing frame
            const updatedFrame = frames[idx];
            const segments = getFrameSegments(updatedFrame);
            setEditingFrame({ frame: updatedFrame, dayIndex: updatedFrame.dayIndex, segments });
        }
    };

    // Add new availability slot
    const addNewSlot = () => {
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
            dayIndex: addingSlot.dayIndex
        };

        const saved = localStorage.getItem('glowbook_salon');
        const data = saved ? JSON.parse(saved) : {};
        const updatedAvailability = [...(data.availability || []), newFrame];
        data.availability = updatedAvailability;
        localStorage.setItem('glowbook_salon', JSON.stringify(data));
        syncWithServer(updatedAvailability);
        window.dispatchEvent(new Event('glowbook_update'));
        setAddingSlot(null);
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
                    <button onClick={prevWeek} className="p-2 hover:bg-foreground/5 rounded-lg text-foreground/50 transition-colors"><ChevronLeft size={20} /></button>
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
                                            onClick={() => handleEmptySlotClick(dayIndex, hour, day)}
                                            className="absolute w-full h-16 border-b border-border/60 hover:bg-emerald-500/[0.05] cursor-pointer transition-all group/grid"
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
                                    {availability.filter(frame => frame.dayIndex === dayIndex).map(frame => {
                                        const segments = getFrameSegments(frame);
                                        const isEditing = editingFrame?.frame.id === frame.id;
                                        const hasBookings = segments.some(s => s.type === 'booked');
                                        const frameStartMins = timeToMins(frame.startTime);
                                        const frameEndMins = frameStartMins + frame.duration;

                                        return (
                                            <div key={frame.id}>
                                                {/* Full frame outline */}
                                                <div
                                                    onClick={(e) => handleFrameClick(frame, e)}
                                                    className={clsx(
                                                        "absolute inset-x-0.5 rounded-lg z-[5] cursor-pointer transition-all",
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
                                                                    className="absolute inset-x-0 bg-rose-500/20 border-y border-rose-500/30 overflow-hidden"
                                                                    style={{ top: `${segTopPx}px`, height: `${segHeightPx}px` }}
                                                                    title={`Bokad: ${seg.appointment?.clientName} — ${seg.appointment?.service}`}
                                                                >
                                                                    <div className="absolute inset-0" style={{
                                                                        backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(239,68,68,0.08) 4px, rgba(239,68,68,0.08) 8px)'
                                                                    }} />
                                                                    <div className="px-1.5 py-0.5 flex items-center gap-1 h-full relative z-[1]">
                                                                        <CalendarCheck size={10} className="text-rose-500 shrink-0" />
                                                                        <span className="text-[8px] font-black text-rose-500 truncate uppercase tracking-wider">
                                                                            {seg.start} — {seg.appointment?.clientName || 'Bokad'}
                                                                        </span>
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
                                                    <div className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center pointer-events-none">
                                                        {!isEditing && (
                                                            <div className={clsx(
                                                                "text-[10px] font-black px-3 py-1 rounded-full shadow-2xl uppercase tracking-[0.15em] border border-emerald-400/30 transition-all group-hover/frame:scale-110",
                                                                hasBookings
                                                                    ? "bg-emerald-600/90 text-white backdrop-blur-sm"
                                                                    : "bg-emerald-600 text-white"
                                                            )}>
                                                                {frame.startTime} – {minsToTime(frameEndMins)}
                                                            </div>
                                                        )}
                                                        {isEditing && (
                                                            <div className="bg-emerald-600 text-white text-[9px] font-black px-4 py-2 rounded-full shadow-2xl uppercase tracking-[0.2em] animate-pulse border-2 border-white/20">
                                                                ✨ Redigerar
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Appointments — Always rendered on top (provider view) */}
                                    {!hideAppointments && appointments.filter(apt => apt.dayIndex === dayIndex && apt.status !== 'cancelled').map(apt => (
                                        <div
                                            key={apt.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onCancelAppointment) {
                                                    const confirm = window.confirm(`Vill du avboka ${apt.clientName} (${apt.clientEmail || 'Ingen e-post'}, ${apt.clientPhone || 'Inget nummer'}) för ${apt.service}?`);
                                                    if (confirm) onCancelAppointment(apt.id);
                                                }
                                            }}
                                            className={clsx(
                                                "absolute inset-x-1 rounded-lg border p-2 text-[10px] cursor-pointer hover:shadow-md transition-all z-10 overflow-hidden",
                                                apt.color || "bg-white dark:bg-[#1a1a1a] border-border"
                                            )}
                                            style={getItemStyle(apt)}
                                            title={`Kund: ${apt.clientName}\nEmail: ${apt.clientEmail || '-'}\nTel: ${apt.clientPhone || '-'}\nTjänst: ${apt.service}`}
                                        >
                                            <div className="font-bold truncate">{apt.service}</div>
                                            <div className="text-foreground/50 truncate">{apt.startTime} - {apt.clientName}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Editing Panel (slides in from right) */}
            <AnimatePresence>
                {editingFrame && (
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 30 }}
                        className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l border-border shadow-2xl z-[30] flex flex-col overflow-hidden"
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
                                                const end = minsToTime(timeToMins(editingFrame.frame.startTime) + editingFrame.frame.duration);
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
                                            value={minsToTime(timeToMins(editingFrame.frame.startTime) + editingFrame.frame.duration)}
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
                                                    <div className="text-[10px] text-foreground/40">
                                                        {seg.appointment.clientName} — {seg.appointment.service}
                                                    </div>
                                                )}
                                                <p className="text-[8px] text-rose-400/60 italic font-medium">Kan inte ändras eller tas bort</p>
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
                                                className="w-full py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
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
                                    className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                                >
                                    <Trash2 size={14} />
                                    Ta bort hela blocket
                                </button>
                            )}
                            <button
                                onClick={() => setEditingFrame(null)}
                                className="w-full py-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold text-xs transition-all"
                            >
                                Klar
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add New Slot Panel */}
            <AnimatePresence>
                {addingSlot && !hideAppointments && (
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 30 }}
                        className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l border-border shadow-2xl z-[30] flex flex-col overflow-hidden"
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
                        </div>

                        <div className="p-4 border-t border-border space-y-3 shrink-0 bg-foreground/[0.01]">
                            <button
                                onClick={addNewSlot}
                                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                            >
                                <Plus size={14} />
                                Lägg till tid
                            </button>
                            <button
                                onClick={() => setAddingSlot(null)}
                                className="w-full py-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold text-xs transition-all"
                            >
                                Avbryt
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
