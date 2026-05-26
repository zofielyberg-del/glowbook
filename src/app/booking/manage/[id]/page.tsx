'use client';

import { useState, useEffect, use } from "react";
import Header from "@/components/layout/Header";
import { Clock, Calendar as CalendarIcon, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ManageBookingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: appointmentId } = use(params);
    const searchParams = useSearchParams();
    const successMessage = searchParams.get('success') === 'rescheduled' ? 'Din tid har ombokats! Ett nytt bekräftelsemail har skickats.' : null;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [appointment, setAppointment] = useState<any>(null);
    
    // Actions states
    const [cancelling, setCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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
                            <Link
                                href={`/booking/reschedule/${appointmentId}`}
                                className="flex-1 py-4 bg-champagne-500 hover:bg-champagne-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-champagne-500/15 transition-all text-sm uppercase tracking-wider text-center"
                            >
                                <RefreshCw size={16} />
                                Omboka behandling
                            </Link>
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
        </div>
    );
}
