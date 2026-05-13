'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Clock, Minus, Coffee, ChevronDown, AlertTriangle, ShieldAlert, CalendarCheck } from 'lucide-react';
import clsx from 'clsx';

interface TimeSlot {
    start: string;
    end: string;
}

interface ScheduleBreak {
    start: string;
    duration: number; // minutes
}

interface DaySchedule {
    active: boolean;
    slots: TimeSlot[];
    breaks?: ScheduleBreak[];
}

interface ScheduleData {
    [dayIndex: number]: DaySchedule;
}

const BREAK_DURATIONS = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 tim' },
    { value: 90, label: '1.5 tim' },
    { value: 120, label: '2 tim' },
];

interface Practitioner {
    id: string;
    name: string;
    role: string;
    title?: string;
    schedule?: any;
}

interface Appointment {
    id: string;
    dayIndex: number;
    startTime: string;
    duration: number;
    practitionerId?: string;
    clientName?: string;
    service?: string;
    status?: string;
}

interface WeeklyScheduleGridProps {
    practitioner: Practitioner;
    appointments?: Appointment[];
    onClose: () => void;
    onSave: (schedule: ScheduleData) => void;
}

const DAY_NAMES = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
const DAY_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 - 21:00
const DAY_COLORS = [
    { bg: 'bg-blue-500', border: 'border-blue-400/40', text: 'text-blue-300', fill: 'bg-blue-500/25', accent: 'bg-blue-400' },
    { bg: 'bg-violet-500', border: 'border-violet-400/40', text: 'text-violet-300', fill: 'bg-violet-500/25', accent: 'bg-violet-400' },
    { bg: 'bg-emerald-500', border: 'border-emerald-400/40', text: 'text-emerald-300', fill: 'bg-emerald-500/25', accent: 'bg-emerald-400' },
    { bg: 'bg-amber-500', border: 'border-amber-400/40', text: 'text-amber-300', fill: 'bg-amber-500/25', accent: 'bg-amber-400' },
    { bg: 'bg-rose-500', border: 'border-rose-400/40', text: 'text-rose-300', fill: 'bg-rose-500/25', accent: 'bg-rose-400' },
    { bg: 'bg-cyan-500', border: 'border-cyan-400/40', text: 'text-cyan-300', fill: 'bg-cyan-500/25', accent: 'bg-cyan-400' },
    { bg: 'bg-slate-400', border: 'border-slate-400/40', text: 'text-slate-300', fill: 'bg-slate-500/25', accent: 'bg-slate-400' },
];

function timeToMins(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function normalizeSchedule(raw: any): ScheduleData {
    const result: ScheduleData = {};
    for (let d = 0; d < 7; d++) {
        const dayData = raw?.[d];
        if (!dayData) {
            result[d] = { active: false, slots: [{ start: '09:00', end: '17:00' }], breaks: [] };
        } else if (dayData.slots && Array.isArray(dayData.slots)) {
            result[d] = { active: dayData.active !== false, slots: dayData.slots, breaks: dayData.breaks || [] };
        } else {
            result[d] = {
                active: dayData.active !== false,
                slots: [{ start: dayData.start || '09:00', end: dayData.end || '17:00' }],
                breaks: dayData.breaks || []
            };
        }
    }
    return result;
}

function breakEnd(brk: ScheduleBreak): string {
    const [h, m] = brk.start.split(':').map(Number);
    const totalMins = h * 60 + m + brk.duration;
    const eh = Math.floor(totalMins / 60);
    const em = totalMins % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

function timeToY(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return ((h - 7) + m / 60); // relative to 07:00
}

export default function WeeklyScheduleGrid({ practitioner, appointments = [], onClose, onSave }: WeeklyScheduleGridProps) {
    const [schedule, setSchedule] = useState<ScheduleData>(() => normalizeSchedule(practitioner.schedule));
    const [editingSlot, setEditingSlot] = useState<{ day: number; slot: number } | null>(null);
    const [conflictWarning, setConflictWarning] = useState<{ message: string; action: () => void } | null>(null);

    // Filter appointments for this practitioner only (confirmed/pending, not cancelled)
    const practitionerAppointments = useMemo(() => {
        return appointments.filter((apt) =>
            (apt.practitionerId === practitioner.id || apt.practitionerId === 'any') &&
            apt.status !== 'cancelled'
        );
    }, [appointments, practitioner.id]);

    // Check if a day has booked appointments
    const getBookingsForDay = useCallback((dayIndex: number) => {
        return practitionerAppointments.filter(apt => apt.dayIndex === dayIndex);
    }, [practitionerAppointments]);

    // Check if a specific slot time range has bookings
    const getBookingsInRange = useCallback((dayIndex: number, start: string, end: string) => {
        const startMins = timeToMins(start);
        const endMins = timeToMins(end);
        return practitionerAppointments.filter(apt => {
            if (apt.dayIndex !== dayIndex) return false;
            const aptStart = timeToMins(apt.startTime);
            const aptEnd = aptStart + (apt.duration || 30);
            return aptStart < endMins && aptEnd > startMins;
        });
    }, [practitionerAppointments]);

    const totalHours = useMemo(() => {
        let total = 0;
        for (let d = 0; d < 7; d++) {
            if (!schedule[d]?.active) continue;
            for (const slot of schedule[d].slots) {
                const [sh, sm] = slot.start.split(':').map(Number);
                const [eh, em] = slot.end.split(':').map(Number);
                total += (eh + em / 60) - (sh + sm / 60);
            }
            for (const brk of (schedule[d].breaks || [])) {
                total -= brk.duration / 60;
            }
        }
        return Math.round(total * 10) / 10;
    }, [schedule]);

    const totalBreakMinutes = useMemo(() => {
        let total = 0;
        for (let d = 0; d < 7; d++) {
            if (!schedule[d]?.active) continue;
            for (const brk of (schedule[d].breaks || [])) {
                total += brk.duration;
            }
        }
        return total;
    }, [schedule]);

    const totalBookedCount = useMemo(() => practitionerAppointments.length, [practitionerAppointments]);

    const toggleDay = useCallback((dayIndex: number) => {
        const dayData = schedule[dayIndex];
        if (dayData?.active) {
            // Turning OFF — check for bookings
            const dayBookings = getBookingsForDay(dayIndex);
            if (dayBookings.length > 0) {
                setConflictWarning({
                    message: `Det finns ${dayBookings.length} bokning(ar) på ${DAY_NAMES[dayIndex]}. Du kan inte stänga av denna dag förrän bokningarna är avklarade eller avbokade.`,
                    action: () => setConflictWarning(null),
                });
                return;
            }
        }
        setSchedule(prev => ({
            ...prev,
            [dayIndex]: { ...prev[dayIndex], active: !prev[dayIndex].active }
        }));
    }, [schedule, getBookingsForDay]);

    const updateSlot = useCallback((dayIndex: number, slotIndex: number, field: 'start' | 'end', value: string) => {
        setSchedule(prev => {
            const newSlots = [...prev[dayIndex].slots];
            const oldSlot = newSlots[slotIndex];
            const newSlot = { ...oldSlot, [field]: value };

            // Check if shrinking the slot would cut off booked appointments
            const bookingsInOldRange = getBookingsInRange(dayIndex, oldSlot.start, oldSlot.end);
            if (bookingsInOldRange.length > 0) {
                // Check if any booking falls outside the new range
                const newStart = timeToMins(newSlot.start);
                const newEnd = timeToMins(newSlot.end);
                const conflicting = bookingsInOldRange.filter(apt => {
                    const aptStart = timeToMins(apt.startTime);
                    const aptEnd = aptStart + (apt.duration || 30);
                    return aptStart < newStart || aptEnd > newEnd;
                });
                if (conflicting.length > 0) {
                    setConflictWarning({
                        message: `Kan inte ändra tiden — ${conflicting.length} bokning(ar) faller utanför det nya intervallet. Avboka bokningarna först.`,
                        action: () => setConflictWarning(null),
                    });
                    return prev; // Don't update
                }
            }

            newSlots[slotIndex] = newSlot;
            return { ...prev, [dayIndex]: { ...prev[dayIndex], slots: newSlots } };
        });
    }, [getBookingsInRange]);

    const addSlot = useCallback((dayIndex: number) => {
        setSchedule(prev => {
            const slots = prev[dayIndex].slots;
            const last = slots[slots.length - 1];
            const [h] = (last?.end || '17:00').split(':').map(Number);
            const newStart = `${String(Math.min(h + 1, 22)).padStart(2, '0')}:00`;
            const newEnd = `${String(Math.min(h + 3, 23)).padStart(2, '0')}:00`;
            return {
                ...prev,
                [dayIndex]: { active: true, slots: [...slots, { start: newStart, end: newEnd }], breaks: prev[dayIndex].breaks }
            };
        });
    }, []);

    const removeSlot = useCallback((dayIndex: number, slotIndex: number) => {
        const slot = schedule[dayIndex]?.slots[slotIndex];
        if (!slot) return;

        // Check for bookings in this slot
        const slotBookings = getBookingsInRange(dayIndex, slot.start, slot.end);
        if (slotBookings.length > 0) {
            setConflictWarning({
                message: `Kan inte ta bort detta pass — det finns ${slotBookings.length} aktiv(a) bokning(ar) mellan ${slot.start}–${slot.end}. Avboka bokningarna först.`,
                action: () => setConflictWarning(null),
            });
            return;
        }

        setSchedule(prev => {
            const slots = [...prev[dayIndex].slots];
            slots.splice(slotIndex, 1);

            // If removing the last slot, deactivate the day
            if (slots.length === 0) {
                return {
                    ...prev,
                    [dayIndex]: { active: false, slots: [{ start: '09:00', end: '17:00' }], breaks: [] }
                };
            }

            return { ...prev, [dayIndex]: { ...prev[dayIndex], slots } };
        });
    }, [schedule, getBookingsInRange]);

    const addBreak = useCallback((dayIndex: number) => {
        setSchedule(prev => {
            const dayData = prev[dayIndex];
            const breaks = [...(dayData.breaks || [])];
            breaks.push({ start: '12:00', duration: 30 });
            return { ...prev, [dayIndex]: { ...dayData, breaks } };
        });
    }, []);

    const updateBreak = useCallback((dayIndex: number, breakIndex: number, field: 'start' | 'duration', value: string | number) => {
        setSchedule(prev => {
            const breaks = [...(prev[dayIndex].breaks || [])];
            if (field === 'start') {
                breaks[breakIndex] = { ...breaks[breakIndex], start: value as string };
            } else {
                breaks[breakIndex] = { ...breaks[breakIndex], duration: value as number };
            }
            return { ...prev, [dayIndex]: { ...prev[dayIndex], breaks } };
        });
    }, []);

    const removeBreak = useCallback((dayIndex: number, breakIndex: number) => {
        setSchedule(prev => {
            const breaks = [...(prev[dayIndex].breaks || [])];
            breaks.splice(breakIndex, 1);
            return { ...prev, [dayIndex]: { ...prev[dayIndex], breaks } };
        });
    }, []);

    const hourHeight = 48; // px per hour in the grid
    const gridHeight = HOURS.length * hourHeight;

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200]"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-5xl max-h-[92vh] bg-[#0f0f0f] rounded-[32px] shadow-2xl z-[201] overflow-hidden border border-white/[0.08] flex flex-col"
            >
                {/* Header */}
                <div className="px-8 py-5 flex items-center justify-between shrink-0 border-b border-white/[0.04] bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/25">
                            {practitioner.name.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-0.5">
                                <h3 className="text-lg font-bold text-white">{practitioner.name}</h3>
                                <div className="px-2.5 py-1 bg-blue-500/10 rounded-lg text-[10px] font-bold text-blue-400 border border-blue-500/20">
                                    {totalHours}h / vecka
                                </div>
                                {totalBreakMinutes > 0 && (
                                    <div className="px-2.5 py-1 bg-orange-500/10 rounded-lg text-[10px] font-bold text-orange-400 border border-orange-500/20 flex items-center gap-1">
                                        <Coffee size={10} />
                                        {totalBreakMinutes >= 60 ? `${Math.floor(totalBreakMinutes / 60)}h ${totalBreakMinutes % 60 > 0 ? `${totalBreakMinutes % 60}m` : ''}` : `${totalBreakMinutes}m`} rast
                                    </div>
                                )}
                                {totalBookedCount > 0 && (
                                    <div className="px-2.5 py-1 bg-rose-500/10 rounded-lg text-[10px] font-bold text-rose-400 border border-rose-500/20 flex items-center gap-1">
                                        <CalendarCheck size={10} />
                                        {totalBookedCount} bokning{totalBookedCount !== 1 ? 'ar' : ''}
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                                {practitioner.title || practitioner.role} · Kunden bokar inom dessa tider
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onSave(schedule)}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] hover:bg-blue-500 shadow-lg shadow-blue-600/20 hover:scale-[1.03] active:scale-[0.97] transition-all"
                        >
                            Spara Schema
                        </button>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-white/40 hover:text-white transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Conflict Warning Banner */}
                <AnimatePresence>
                    {conflictWarning && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-8 py-4 bg-red-950/60 border-b border-red-500/20 flex items-center gap-4">
                                <div className="p-2 bg-red-500/20 rounded-lg shrink-0">
                                    <ShieldAlert size={18} className="text-red-400" />
                                </div>
                                <p className="text-[11px] font-bold text-red-300 leading-relaxed flex-1">{conflictWarning.message}</p>
                                <button
                                    onClick={conflictWarning.action}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shrink-0"
                                >
                                    OK
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main content: Grid + Sidebar */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Grid View */}
                    <div className="flex-1 overflow-auto p-4">
                        <div className="min-w-[600px]">
                            {/* Day headers */}
                            <div className="flex sticky top-0 z-10 bg-[#0f0f0f] pb-2">
                                <div className="w-14 shrink-0" /> {/* Time column spacer */}
                                {DAY_SHORT.map((day, i) => {
                                    const dayBookings = getBookingsForDay(i);
                                    return (
                                        <div key={i} className="flex-1 px-1">
                                            <button
                                                onClick={() => toggleDay(i)}
                                                className={clsx(
                                                    "w-full py-2 rounded-lg text-center transition-all text-[11px] font-bold uppercase tracking-wider border relative",
                                                    schedule[i]?.active
                                                        ? `${DAY_COLORS[i].fill} ${DAY_COLORS[i].border} ${DAY_COLORS[i].text}`
                                                        : "bg-white/[0.02] border-white/[0.04] text-white/15 hover:text-white/25"
                                                )}
                                            >
                                                {day}
                                                {dayBookings.length > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-black text-white flex items-center justify-center shadow-lg">
                                                        {dayBookings.length}
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Grid body */}
                            <div className="flex relative">
                                {/* Time labels */}
                                <div className="w-14 shrink-0">
                                    {HOURS.map(hour => (
                                        <div
                                            key={hour}
                                            className="flex items-start justify-end pr-3 text-[10px] font-mono text-white/40 font-bold"
                                            style={{ height: hourHeight }}
                                        >
                                            {String(hour).padStart(2, '0')}:00
                                        </div>
                                    ))}
                                </div>

                                {/* Day columns */}
                                {Array.from({ length: 7 }).map((_, dayIndex) => {
                                    const dayBookings = getBookingsForDay(dayIndex);
                                    return (
                                        <div
                                            key={dayIndex}
                                            className="flex-1 relative px-0.5"
                                            style={{ height: gridHeight }}
                                        >
                                            {/* Hour grid lines */}
                                            {HOURS.map((hour, hi) => (
                                                <div
                                                    key={hour}
                                                    className={clsx(
                                                        "absolute left-0 right-0 border-t",
                                                        hi === 0 ? "border-white/20" : "border-white/10"
                                                    )}
                                                    style={{ top: hi * hourHeight }}
                                                />
                                            ))}

                                            {/* Time slot blocks */}
                                            {schedule[dayIndex]?.active && schedule[dayIndex].slots.map((slot, slotIndex) => {
                                                const startY = timeToY(slot.start) * hourHeight;
                                                const endY = timeToY(slot.end) * hourHeight;
                                                const height = Math.max(endY - startY, 16);
                                                const colors = DAY_COLORS[dayIndex];
                                                const isEditing = editingSlot?.day === dayIndex && editingSlot?.slot === slotIndex;
                                                const slotBookings = getBookingsInRange(dayIndex, slot.start, slot.end);

                                                return (
                                                    <div
                                                        key={slotIndex}
                                                        onClick={() => setEditingSlot(
                                                            isEditing ? null : { day: dayIndex, slot: slotIndex }
                                                        )}
                                                        className={clsx(
                                                            "absolute left-1 right-1 rounded-lg cursor-pointer transition-all duration-200 group overflow-hidden",
                                                            isEditing
                                                                ? `${colors.fill} ring-2 ring-offset-1 ring-offset-[#0a0a0a] ${colors.border.replace('border-', 'ring-')}`
                                                                : `${colors.fill} border ${colors.border} hover:brightness-125`
                                                        )}
                                                        style={{
                                                            top: startY + 1,
                                                            height: height - 2,
                                                        }}
                                                    >
                                                        {/* Top accent bar */}
                                                        <div className={clsx("h-0.5 w-full", colors.accent, "opacity-60")} />

                                                        {/* Content */}
                                                        <div className="px-2 py-1 flex flex-col justify-between h-full">
                                                            <span className={clsx("text-[9px] font-bold", colors.text, "leading-tight")}>
                                                                {slot.start}
                                                            </span>
                                                            {height > 40 && (
                                                                <span className={clsx("text-[9px] font-bold", colors.text, "opacity-60 leading-tight")}>
                                                                    {slot.end}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Booking indicator on slot */}
                                                        {slotBookings.length > 0 && (
                                                            <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-rose-500 rounded text-[7px] font-black text-white leading-none">
                                                                {slotBookings.length} 🔒
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Booked appointment blocks (red, locked) */}
                                            {schedule[dayIndex]?.active && dayBookings.map((apt, aptIdx) => {
                                                const aptStartY = timeToY(apt.startTime) * hourHeight;
                                                const aptDuration = apt.duration || 30;
                                                const aptEndMins = timeToMins(apt.startTime) + aptDuration;
                                                const aptEndH = Math.floor(aptEndMins / 60);
                                                const aptEndM = aptEndMins % 60;
                                                const aptEndTime = `${String(aptEndH).padStart(2, '0')}:${String(aptEndM).padStart(2, '0')}`;
                                                const aptEndY = timeToY(aptEndTime) * hourHeight;
                                                const height = Math.max(aptEndY - aptStartY, 14);

                                                return (
                                                    <div
                                                        key={`apt-${apt.id || aptIdx}`}
                                                        className="absolute left-2 right-2 rounded-md cursor-not-allowed overflow-hidden border border-rose-500/40 bg-rose-500/15 z-[2]"
                                                        style={{
                                                            top: aptStartY + 2,
                                                            height: height - 4,
                                                        }}
                                                        title={`Bokad: ${apt.clientName || 'Kund'} — ${apt.service || 'Tjänst'} (${apt.startTime}–${aptEndTime})`}
                                                    >
                                                        <div className="px-1.5 py-0.5 flex items-center gap-1 h-full">
                                                            <CalendarCheck size={8} className="text-rose-400/80 shrink-0" />
                                                            <span className="text-[7px] font-black text-rose-400/80 truncate uppercase tracking-wider">
                                                                {apt.startTime} Bokad
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Break blocks */}
                                            {schedule[dayIndex]?.active && (schedule[dayIndex].breaks || []).map((brk, brkIndex) => {
                                                const startY = timeToY(brk.start) * hourHeight;
                                                const endTime = breakEnd(brk);
                                                const endY = timeToY(endTime) * hourHeight;
                                                const height = Math.max(endY - startY, 14);

                                                return (
                                                    <div
                                                        key={`brk-${brkIndex}`}
                                                        className="absolute left-1 right-1 rounded-lg cursor-default overflow-hidden border border-orange-500/30 bg-orange-500/10"
                                                        style={{
                                                            top: startY + 1,
                                                            height: height - 2,
                                                            backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(249,115,22,0.08) 3px, rgba(249,115,22,0.08) 6px)',
                                                        }}
                                                    >
                                                        <div className="px-2 py-0.5 flex items-center gap-1 h-full">
                                                            <Coffee size={8} className="text-orange-400/70 shrink-0" />
                                                            <span className="text-[8px] font-bold text-orange-400/70 truncate">
                                                                {brk.duration}min
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Slot Editor */}
                    <div className="w-72 border-l border-white/[0.04] overflow-y-auto bg-white/[0.01] shrink-0">
                        <div className="p-4 border-b border-white/[0.04]">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Redigera tider</p>
                            <p className="text-[10px] text-white/30">Klicka på ett block i rutnätet eller redigera nedan</p>
                        </div>

                        {totalBookedCount > 0 && (
                            <div className="mx-3 mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                <p className="text-[9px] font-bold text-rose-400 flex items-center gap-1.5 leading-relaxed">
                                    <ShieldAlert size={12} className="shrink-0" />
                                    {totalBookedCount} aktiv(a) bokning(ar) skyddas. Tider med bokningar kan inte tas bort.
                                </p>
                            </div>
                        )}

                        <div className="p-3 space-y-1">
                            {DAY_NAMES.map((dayName, dayIndex) => {
                                const dayData = schedule[dayIndex];
                                const isActive = dayData?.active;
                                const colors = DAY_COLORS[dayIndex];
                                const dayBookings = getBookingsForDay(dayIndex);

                                return (
                                    <div key={dayIndex} className={clsx(
                                        "rounded-xl transition-all duration-200",
                                        isActive ? "bg-white/[0.02]" : "opacity-40"
                                    )}>
                                        {/* Day header */}
                                        <div className="flex items-center justify-between px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className={clsx(
                                                    "w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black",
                                                    isActive ? `${colors.fill} ${colors.text}` : "bg-white/[0.04] text-white/20"
                                                )}>
                                                    {DAY_SHORT[dayIndex].charAt(0)}
                                                </div>
                                                <span className={clsx(
                                                    "text-xs font-bold",
                                                    isActive ? "text-white/90" : "text-white/40"
                                                )}>
                                                    {DAY_SHORT[dayIndex]}
                                                </span>
                                                {dayBookings.length > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 text-[8px] font-black rounded-md">
                                                        {dayBookings.length} bokad
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {isActive && (
                                                    <>
                                                        <button
                                                            onClick={() => addBreak(dayIndex)}
                                                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400/60 hover:text-orange-400 transition-all border border-orange-500/10"
                                                            title="Lägg till rast"
                                                        >
                                                            <Coffee size={12} />
                                                            <span className="text-[9px] font-black uppercase tracking-tighter">Rast</span>
                                                        </button>
                                                        <button
                                                            onClick={() => addSlot(dayIndex)}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-all border border-white/5"
                                                            title="Lägg till pass"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </>
                                                )}
                                                <div
                                                    onClick={() => toggleDay(dayIndex)}
                                                    className={clsx(
                                                        "w-9 h-5 rounded-full cursor-pointer relative transition-all duration-300 border",
                                                        isActive
                                                            ? (dayBookings.length > 0 ? "bg-rose-600 border-rose-500" : "bg-blue-600 border-blue-500")
                                                            : "bg-white/[0.04] border-white/[0.08]"
                                                    )}
                                                    title={dayBookings.length > 0 ? `${dayBookings.length} bokning(ar) — kan ej stängas av` : undefined}
                                                >
                                                    <div className={clsx(
                                                        "absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-sm",
                                                        isActive ? "right-0.5" : "left-0.5 opacity-40"
                                                    )} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Slots */}
                                        {isActive && (
                                            <div className="px-3 pb-2 space-y-1">
                                                {dayData.slots.map((slot, slotIndex) => {
                                                    const isSelected = editingSlot?.day === dayIndex && editingSlot?.slot === slotIndex;
                                                    const slotBookings = getBookingsInRange(dayIndex, slot.start, slot.end);
                                                    const hasBookings = slotBookings.length > 0;

                                                    return (
                                                        <div
                                                            key={slotIndex}
                                                            onClick={() => setEditingSlot(isSelected ? null : { day: dayIndex, slot: slotIndex })}
                                                            className={clsx(
                                                                "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all cursor-pointer group",
                                                                isSelected
                                                                    ? `${colors.fill} ${colors.border}`
                                                                    : hasBookings
                                                                        ? "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/30"
                                                                        : "bg-white/[0.02] border-white/[0.03] hover:border-white/[0.06]"
                                                            )}
                                                        >
                                                            <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", hasBookings ? "bg-rose-500" : colors.accent)} />
                                                            <input
                                                                type="time"
                                                                lang="sv-SE"
                                                                value={slot.start}
                                                                onChange={(e) => updateSlot(dayIndex, slotIndex, 'start', e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="bg-transparent text-white text-[11px] font-bold outline-none w-14 text-center focus:text-blue-400 transition-colors"
                                                            />
                                                            <span className="text-white/10 text-[9px]">–</span>
                                                            <input
                                                                type="time"
                                                                lang="sv-SE"
                                                                value={slot.end}
                                                                onChange={(e) => updateSlot(dayIndex, slotIndex, 'end', e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="bg-transparent text-white text-[11px] font-bold outline-none w-14 text-center focus:text-blue-400 transition-colors"
                                                            />
                                                            {hasBookings && (
                                                                <span className="text-[7px] font-black text-rose-400 uppercase tracking-wider shrink-0">🔒</span>
                                                            )}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); removeSlot(dayIndex, slotIndex); }}
                                                                className={clsx(
                                                                    "ml-auto w-5 h-5 rounded flex items-center justify-center transition-all shrink-0",
                                                                    hasBookings
                                                                        ? "text-white/10 cursor-not-allowed"
                                                                        : "text-red-400/40 hover:text-red-400 hover:bg-red-500/10"
                                                                )}
                                                                title={hasBookings ? "Kan ej ta bort — aktiva bokningar" : "Ta bort pass"}
                                                            >
                                                                <Minus size={10} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Breaks */}
                                        {isActive && (dayData.breaks || []).length > 0 && (
                                            <div className="px-3 pb-2 space-y-1">
                                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-orange-400/40 flex items-center gap-1 px-1 pt-1">
                                                    <Coffee size={8} /> Raster
                                                </p>
                                                {(dayData.breaks || []).map((brk, brkIndex) => (
                                                    <div
                                                        key={brkIndex}
                                                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border bg-orange-500/5 border-orange-500/15 group"
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-orange-500" />
                                                        <input
                                                            type="time"
                                                            lang="sv-SE"
                                                            value={brk.start}
                                                            onChange={(e) => updateBreak(dayIndex, brkIndex, 'start', e.target.value)}
                                                            className="bg-transparent text-orange-300 text-[11px] font-bold outline-none w-14 text-center focus:text-orange-400 transition-colors"
                                                        />
                                                        <select
                                                            value={brk.duration}
                                                            onChange={(e) => updateBreak(dayIndex, brkIndex, 'duration', parseInt(e.target.value))}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="bg-transparent text-orange-300 text-[10px] font-bold outline-none appearance-none cursor-pointer hover:text-orange-400 transition-colors px-1 border border-orange-500/20 rounded-md py-0.5"
                                                        >
                                                            {BREAK_DURATIONS.map(d => (
                                                                <option key={d.value} value={d.value} className="bg-[#1a1a1a] text-white">
                                                                    {d.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeBreak(dayIndex, brkIndex); }}
                                                            className="ml-auto w-5 h-5 rounded flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                        >
                                                            <Minus size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Sidebar footer */}
                        <div className="p-4 border-t border-white/[0.04] mt-auto space-y-2">
                            <div className="flex items-center gap-2 text-[8px] text-white/20">
                                <div className="w-2 h-2 rounded-full bg-emerald-500/40 shrink-0" /> Ledigt pass
                                <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 ml-2" /> Bokad tid (skyddad)
                                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 ml-2" /> Rast
                            </div>
                            <p className="text-[9px] text-white/10 italic leading-relaxed">
                                Tider med aktiva bokningar kan inte tas bort eller ändras. Avboka via kundhanteringen först.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
