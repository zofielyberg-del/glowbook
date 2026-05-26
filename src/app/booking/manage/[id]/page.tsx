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
            const res = await fetch(`/api/bookings/get?id=${appointmentId}`, { cache: 'no-store' });
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
            const localStart = new Date(`${selectedDateSlot.fullDate}T${selectedDateSlot.time}:00`);
            const newStartTimeUtc = localStart.toISOString();

            const res = await fetch('/api/bookings/reschedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId,
                    newDate: selectedDateSlot.fullDate,
                    newStartTime: selectedDateSlot.time,
                    newStartTimeUtc
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

    const [computedAvailability, setComputedAvailability] = useState<any[]>([]);

    useEffect(() => {
        if (!appointment || !appointment.salon) {
            setComputedAvailability([]);
            return;
        }

        let isMounted = true;

        async function fetchAvailability() {
            try {
                const salonId = appointment.salon.id;
                // If service_id is missing, find it by service_name or fallback to first service
                const service = (appointment.salon.services || []).find((s: any) => s.name === appointment.service_name) || (appointment.salon.services || [])[0];
                const serviceId = appointment.service_id || service?.id;
                const practitionerId = appointment.practitioner_id || 'any';
                
                const url = `/api/availability?salonId=${salonId}&serviceId=${serviceId}&practitionerId=${practitionerId}&excludeAppointmentId=${appointmentId}`;
                const res = await fetch(url);
                const data = await res.json();
                
                if (isMounted) {
                    if (res.ok) {
                        if (data.success) {
                            if (data.availability && data.availability.length === 0 && data.debug) {
                                setComputedAvailability([{ debug: data.debug } as any]);
                            } else {
                                setComputedAvailability(data.availability || []);
                            }
                        } else {
                            setComputedAvailability([{ error: JSON.stringify(data), url: url } as any]);
                        }
                    } else {
                        setComputedAvailability([{ error: `HTTP ${res.status}`, url: url } as any]);
                    }
                }
            } catch (err: any) {
                console.error("Fel vid hämtning av tider:", err);
                if (isMounted) setComputedAvailability([{ error: err.message || "Catch block error", url } as any]);
            }
        }

        fetchAvailability();

        return () => { isMounted = false; };
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

    // Cancellation policy window check
    const cancellationWindowHours = appointment.salon?.cancellation_window_hours ?? 24;
    const appointmentStartTime = new Date(appointment.start_time).getTime();
    const nowTime = new Date().getTime();
    const hoursToAppointment = (appointmentStartTime - nowTime) / (1000 * 60 * 60);
    const isWithinCancellationWindow = hoursToAppointment < cancellationWindowHours;

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
                    {!isCancelled && isWithinCancellationWindow && (
                        <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-3xl space-y-4">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 flex-shrink-0">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-foreground">Avbokningspolicy ({cancellationWindowHours}h)</h4>
                                    <p className="text-xs text-foreground/50 mt-1 leading-relaxed">
                                        Den här salongen tillämpar en {cancellationWindowHours}-timmars avbokningspolicy. Eftersom din behandling startar om mindre än {cancellationWindowHours} timmar kan du tyvärr inte längre avboka eller omboka din tid själv online. 
                                        Vänligen kontakta {appointment.salon?.name} direkt om du har frågor eller vill göra ändringar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isCancelled && !isWithinCancellationWindow && (
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
                            className="bg-card w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-7xl rounded-3xl border border-border shadow-2xl relative z-10 flex flex-col h-[90vh]"
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
                                <div className="p-4 bg-red-500 text-white font-bold text-center z-50">
                                    {computedAvailability.length > 0 && computedAvailability[0].error ? (
                                        <div>
                                            SYSTEM FEL: API returnerade ett fel.<br/>
                                            <span className="text-xs font-normal">{computedAvailability[0].error}</span><br/>
                                            <span className="text-xs font-normal">URL: {computedAvailability[0].url}</span>
                                        </div>
                                    ) : computedAvailability.length > 0 && computedAvailability[0].debug ? (
                                        <div>
                                            SYSTEM DEBUG: Inga tider returnerades, men API skickade denna spårningsdata:<br/>
                                            <span className="text-[10px] font-normal opacity-80 break-words mt-2 block">
                                                TRACE: {computedAvailability[0].debug}
                                            </span>
                                        </div>
                                    ) : (
                                        <div>
                                            SYSTEM DEBUG: Hittade {computedAvailability.length} lediga tider.
                                            Om detta nummer är 0, betyder det att inga tider fanns i databasen för denna kalender,
                                            eller att alla tider filtrerades bort på grund av brist på personal/överlappningar.
                                        </div>
                                    )}
                                </div>
                                <Calendar 
                                    availability={computedAvailability}
                                    onSelectSlot={handleSelectSlot}
                                    hideAppointments={true}
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
