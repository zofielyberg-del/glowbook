'use client';

import { useState, useEffect, useMemo, use } from "react";
import Header from "@/components/layout/Header";
import { Clock, MapPin, Calendar as CalendarIcon, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Calendar from "@/components/dashboard/Calendar";
import Link from "next/link";

function timeToMins(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function minsToTime(m: number) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export default function ManageBookingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: appointmentId } = use(params);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [appointment, setAppointment] = useState<any>(null);
    
    // Actions states
    const [cancelling, setCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [rescheduling, setRescheduling] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedDateSlot, setSelectedDateSlot] = useState<{ day: string; time: string; fullDate: string; dayIndex: number } | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch appointment data
    const fetchAppointmentData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/bookings/get?id=${appointmentId}`);
            const data = await res.json();
            if (data.success && data.appointment) {
                setAppointment(data.appointment);
            } else {
                setError(data.error || "Kunde inte hämta bokningen");
            }
        } catch (e) {
            console.error(e);
            setError("Ett oväntat fel uppstod");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointmentData();
    }, [appointmentId]);

    // Handle Cancellation
    const handleCancelBooking = async () => {
        try {
            setCancelling(true);
            const res = await fetch('/api/bookings/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId })
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage("Din bokning har avbokats. Ett bekräftelsemail har skickats.");
                setShowCancelConfirm(false);
                fetchAppointmentData();
            } else {
                alert(data.error || "Misslyckades att avboka");
            }
        } catch (e) {
            console.error(e);
            alert("Ett fel uppstod vid avbokningen.");
        } finally {
            setCancelling(false);
        }
    };

    // Handle Rescheduling Execution
    const handleRescheduleBooking = async () => {
        if (!selectedDateSlot) return;
        try {
            setRescheduling(true);
            const res = await fetch('/api/bookings/reschedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId,
                    newDate: selectedDateSlot.fullDate,
                    newStartTime: selectedDateSlot.time
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage("Din tid har ombokats! Ett nytt bekräftelsemail har skickats.");
                setShowRescheduleModal(false);
                setSelectedDateSlot(null);
                fetchAppointmentData();
            } else {
                alert(data.error || "Misslyckades att omboka");
            }
        } catch (e) {
            console.error(e);
            alert("Ett fel uppstod vid ombokningen.");
        } finally {
            setRescheduling(false);
        }
    };

    // Availability computer for Rescheduling
    const computedAvailability = useMemo(() => {
        if (!appointment || !appointment.salon) return [];

        const salon = appointment.salon;
        // Find matching service from the salon's list
        const service = (salon.services || []).find((s: any) => s.name === appointment.service_name) || { duration: 30 };
        const serviceDuration = service.duration || 30;
        const step = serviceDuration;
        
        const appointments = salon.appointments || [];
        const allFrames: any[] = [];
        const now = new Date();
        const currentDayIdx = (now.getDay() + 6) % 7;
        const currentMins = now.getHours() * 60 + now.getMinutes();

        // Target practitioner
        const pid = appointment.practitioner_id || 'owner';
        const targetP = (salon.practitioners || []).find((p: any) => p.id === pid) || { id: pid };

        const practitionersToConsider = [targetP];

        if (practitionersToConsider.length > 0) {
            const hasRealScheduleData = practitionersToConsider.some((p: any) => {
                const schedule = p.schedule || {};
                return Object.values(schedule).some((day: any) => day && day.active === true);
            });

            if (hasRealScheduleData) {
                practitionersToConsider.forEach((p: any) => {
                    const schedule = p.schedule || {};
                    Object.entries(schedule).forEach(([dayIndexStr, dayData]: [string, any]) => {
                        if (dayData && dayData.active === true) {
                            const dayIndex = parseInt(dayIndexStr);
                            if (isNaN(dayIndex)) return;
                            const slots = dayData.slots || [];
                            if (slots.length === 0 && dayData.start && dayData.end) {
                                slots.push({ start: dayData.start, end: dayData.end });
                            }
                            const breaks = dayData.breaks || [];

                            slots.forEach((slot: any) => {
                                const slotStart = timeToMins(slot.start);
                                const slotEnd = timeToMins(slot.end);

                                for (let time = slotStart; time <= slotEnd - serviceDuration; time += step) {
                                    const startTimeStr = minsToTime(time);
                                    const startMins = time;
                                    const endMins = time + serviceDuration;

                                    const hasAptOverlap = appointments.some((apt: any) => {
                                        if (apt.dayIndex !== dayIndex) return false;
                                        if (apt.status === 'cancelled') return false;
                                        if (apt.id === appointmentId) return false; // Ignore current appointment in overlap check!

                                        const aptPid = apt.practitionerId || 'owner';
                                        if (aptPid !== p.id && aptPid !== 'any') return false;

                                        const aptStart = timeToMins(apt.startTime);
                                        const aptEnd = aptStart + (apt.duration || 30);
                                        return (startMins < aptEnd && endMins > aptStart);
                                    });
                                    if (hasAptOverlap) continue;

                                    const hasBreakOverlap = breaks.some((brk: any) => {
                                        const brkStart = timeToMins(brk.start);
                                        const brkEnd = brkStart + brk.duration;
                                        return (startMins < brkEnd && endMins > brkStart);
                                    });
                                    if (hasBreakOverlap) continue;

                                    if (dayIndex === currentDayIdx && startMins < currentMins + 15) continue;

                                    allFrames.push({
                                        id: `p-${p.id}-${dayIndex}-${startTimeStr}`,
                                        startTime: startTimeStr,
                                        duration: serviceDuration,
                                        dayIndex: dayIndex,
                                        practitionerId: p.id
                                    });
                                }
                            });
                        }
                    });
                });

                if (allFrames.length > 0) return allFrames;
            }
        }

        // Fallback Strategy 2: Salon availability
        const salonAvailability: any[] = salon.availability || [];
        salonAvailability.forEach((frame: any) => {
            const frameStart = timeToMins(frame.startTime);
            const frameEnd = frameStart + frame.duration;

            for (let time = frameStart; time <= frameEnd - serviceDuration; time += step) {
                const startTimeStr = minsToTime(time);
                const startMins = time;
                const endMins = time + serviceDuration;

                const hasAptOverlap = appointments.some((apt: any) => {
                    if (apt.dayIndex !== frame.dayIndex) return false;
                    if (apt.status === 'cancelled') return false;
                    if (apt.id === appointmentId) return false; // Ignore current appointment in overlap check!
                    const aptStart = timeToMins(apt.startTime);
                    const aptEnd = aptStart + (apt.duration || 30);
                    return (startMins < aptEnd && endMins > aptStart);
                });
                if (hasAptOverlap) continue;

                if (frame.dayIndex === currentDayIdx && startMins < currentMins + 15) continue;

                allFrames.push({
                    id: `avail-${frame.id}-${startTimeStr}`,
                    startTime: startTimeStr,
                    duration: serviceDuration,
                    dayIndex: frame.dayIndex,
                    practitionerId: 'owner'
                });
            }
        });

        return allFrames;
    }, [appointment, appointmentId]);

    const handleSelectSlot = (date: string, time: string) => {
        const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
        const dateObj = new Date(date);
        const dayName = days[dateObj.getDay()];
        const dayIndex = (dateObj.getDay() + 6) % 7;

        setSelectedDateSlot({ day: dayName, time, fullDate: date, dayIndex });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Header />
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-champagne-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-foreground/60 text-sm font-semibold">Hämtar bokningsuppgifter...</p>
                </div>
            </div>
        );
    }

    if (error || !appointment) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-6">
                <Header />
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500">
                    <AlertTriangle size={32} />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">Bokningen hittades inte</h2>
                    <p className="text-foreground/40 text-sm">{error || "Kunde inte ladda dina uppgifter."}</p>
                </div>
                <Link href="/explore" className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-sm">
                    Hitta salonger
                </Link>
            </div>
        );
    }

    const formattedDate = new Date(appointment.booking_date).toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const startTimeStr = new Date(appointment.start_time).toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const isCancelled = appointment.status === 'cancelled';

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <div className="max-w-3xl mx-auto px-4 md:px-6 pt-32 pb-24 space-y-8">
                {/* Back Button */}
                <Link href="/explore" className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground text-sm font-bold transition-colors">
                    <ArrowLeft size={16} />
                    Tillbaka till utforska
                </Link>

                {/* Success Banner */}
                <AnimatePresence>
                    {successMessage && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 text-emerald-700 dark:text-emerald-400 flex items-start gap-4"
                        >
                            <CheckCircle2 className="flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-lg">Klart!</h4>
                                <p className="text-sm mt-1">{successMessage}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Management Card */}
                <div className="bg-card rounded-[32px] md:rounded-[40px] p-6 md:p-10 border border-border shadow-2xl space-y-8 relative overflow-hidden">
                    {/* Status Ribbon */}
                    <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-xs font-black uppercase tracking-wider ${
                        isCancelled ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                        {isCancelled ? 'Avbokad' : 'Bekräftad'}
                    </div>

                    <div className="space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-champagne-600">Bokningshantering</span>
                        <h1 className="text-3xl md:text-4xl font-heading font-black text-foreground">Din bokning hos {appointment.salon?.name}</h1>
                        <p className="text-foreground/50 text-sm">Här kan du hålla koll på, omboka eller avboka din behandling säkert.</p>
                    </div>

                    {/* Booking Details Card */}
                    <div className="p-6 md:p-8 bg-card-deep rounded-3xl border border-border/80 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        <div className="space-y-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 block mb-1">Behandling</span>
                                <span className="text-lg font-bold text-foreground">{appointment.service_name}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 block mb-1">Pris</span>
                                <span className="text-lg font-bold text-foreground highlight">{appointment.total_price} SEK</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 block mb-1">Salong</span>
                                <span className="text-lg font-bold text-foreground">{appointment.salon?.name}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 block mb-1">Datum & Tid</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <CalendarIcon size={18} className="text-champagne-500" />
                                    <span className="font-bold text-foreground capitalize">{formattedDate}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Clock size={18} className="text-champagne-500" />
                                    <span className="font-bold text-foreground">Kl {startTimeStr}</span>
                                </div>
                            </div>

                            {appointment.customer_name && (
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 block mb-1">Bokad för</span>
                                    <span className="font-bold text-foreground">{appointment.customer_name}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions Panel */}
                    {!isCancelled && (
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button
                                onClick={() => setShowRescheduleModal(true)}
                                className="flex-1 py-4 bg-champagne-500 hover:bg-champagne-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-champagne-500/15 transition-all text-sm uppercase tracking-wider"
                            >
                                <RefreshCw size={16} />
                                Omboka behandling
                            </button>
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="py-4 px-8 border border-rose-500/30 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 font-bold rounded-2xl transition-all text-sm uppercase tracking-wider"
                            >
                                Avboka tid
                            </button>
                        </div>
                    )}

                    {isCancelled && (
                        <div className="pt-4 text-center">
                            <p className="text-foreground/40 text-sm mb-4">Denna bokning är avbokad och går inte att ändra.</p>
                            <Link href="/explore" className="inline-flex items-center gap-2 px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-sm">
                                Boka en ny tid
                                <ChevronRight size={16} />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Avboka Confirmation Overlay */}
            <AnimatePresence>
                {showCancelConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCancelConfirm(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card w-full max-w-md p-8 rounded-3xl border border-border shadow-2xl relative z-10 space-y-6 text-center"
                        >
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                                <AlertTriangle size={28} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-foreground">Är du helt säker?</h3>
                                <p className="text-foreground/50 text-sm">
                                    Din bokade tid kommer att raderas och bli tillgänglig för andra kunder direkt. Detta går inte att ångra.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleCancelBooking}
                                    disabled={cancelling}
                                    className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-all uppercase tracking-wider text-xs"
                                >
                                    {cancelling ? 'Avbokar...' : 'Ja, avboka tid'}
                                </button>
                                <button
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="flex-1 py-4 bg-card-deep hover:bg-card-deep/80 text-foreground font-bold rounded-2xl border border-border transition-all uppercase tracking-wider text-xs"
                                >
                                    Avbryt
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Omboka Interactive Modal */}
            <AnimatePresence>
                {showRescheduleModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRescheduleModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl relative z-10 flex flex-col max-h-[85vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-border/80 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">Välj en ny tid</h3>
                                    <p className="text-xs text-foreground/40 mt-1">Hitta en ledig tid för {appointment.service_name}</p>
                                </div>
                                <button 
                                    onClick={() => setShowRescheduleModal(false)}
                                    className="p-2 hover:bg-card-deep rounded-xl text-foreground/40 hover:text-foreground transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body / Calendar Scroll */}
                            <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                <Calendar 
                                    availability={computedAvailability}
                                    onSelectSlot={handleSelectSlot}
                                    selectedSlot={selectedDateSlot ? { date: selectedDateSlot.fullDate, time: selectedDateSlot.time } : null}
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-border/80 flex flex-col sm:flex-row gap-4 items-center justify-between">
                                {selectedDateSlot ? (
                                    <div className="text-center sm:text-left">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-champagne-600 block">Vald ny tid</span>
                                        <span className="text-sm font-bold text-foreground capitalize">
                                            {selectedDateSlot.day} {selectedDateSlot.fullDate} kl {selectedDateSlot.time}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-foreground/40">Vänligen välj en tid i kalendern ovan.</span>
                                )}

                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={handleRescheduleBooking}
                                        disabled={!selectedDateSlot || rescheduling}
                                        className="flex-1 sm:flex-none py-3 px-8 bg-champagne-500 hover:bg-champagne-600 disabled:opacity-40 text-white font-bold rounded-xl transition-all uppercase tracking-wider text-xs"
                                    >
                                        {rescheduling ? 'Bokar om...' : 'Bekräfta ombokning'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowRescheduleModal(false);
                                            setSelectedDateSlot(null);
                                        }}
                                        className="py-3 px-6 bg-card-deep hover:bg-card-deep/80 text-foreground font-bold rounded-xl border border-border transition-all uppercase tracking-wider text-xs"
                                    >
                                        Stäng
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
