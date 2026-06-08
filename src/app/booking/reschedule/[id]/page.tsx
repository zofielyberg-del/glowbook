'use client';

import { useState, useEffect, use } from "react";
import Header from "@/components/layout/Header";
import { ArrowLeft, Clock, CalendarIcon, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Calendar from "@/components/dashboard/Calendar";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: appointmentId } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [appointment, setAppointment] = useState<any>(null);
    const [availability, setAvailability] = useState<any[]>([]);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);

    const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string; fullDate: string; dayIndex: number } | null>(null);
    const [isRescheduling, setIsRescheduling] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function fetchData() {
            try {
                // 1. Fetch Appointment
                const aptRes = await fetch(`/api/bookings/get?id=${appointmentId}`, { cache: 'no-store' });
                const aptData = await aptRes.json();

                if (!aptData.success || !aptData.appointment) {
                    throw new Error(aptData.error || "Kunde inte ladda bokningen.");
                }

                const apt = aptData.appointment;
                if (isMounted) setAppointment(apt);

                // 2. Fetch Availability using cache buster
                const salonId = apt.salon.id;
                const service = (apt.salon.services || []).find((s: any) => s.name === apt.service_name) || (apt.salon.services || [])[0];
                const serviceId = apt.service_id || service?.id;
                const practitionerId = apt.practitioner_id || 'any';

                const availUrl = `/api/availability?salonId=${salonId}&serviceId=${serviceId}&practitionerId=${practitionerId}&excludeAppointmentId=${appointmentId}&_t=${Date.now()}`;
                const availRes = await fetch(availUrl, { cache: 'no-store' });
                const availData = await availRes.json();

                if (availRes.ok && availData.success) {
                    if (isMounted) setAvailability(availData.availability || []);
                    if (availData.availability?.length === 0 && availData.debug) {
                        console.log("AVAILABILITY DEBUG TRACE:", availData.debug);
                    }
                } else {
                    if (isMounted) setAvailabilityError(availData.error || `HTTP ${availRes.status}`);
                }

            } catch (err: any) {
                console.error("Reschedule page error:", err);
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchData();
        return () => { isMounted = false; };
    }, [appointmentId]);

    const handleSelectSlot = (date: string, time: string) => {
        const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
        const dateObj = new Date(`${date}T12:00:00`);
        const dayName = days[dateObj.getDay()];
        const dayIndex = (dateObj.getDay() + 6) % 7;

        setSelectedSlot({ day: dayName, time, fullDate: date, dayIndex });
    };

    const handleReschedule = async () => {
        if (!selectedSlot || !appointment) return;
        
        try {
            setIsRescheduling(true);
            const localStart = new Date(`${selectedSlot.fullDate}T${selectedSlot.time}:00`);
            const newStartTimeUtc = localStart.toISOString();

            const res = await fetch('/api/bookings/reschedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId,
                    newDate: selectedSlot.fullDate,
                    newStartTime: selectedSlot.time,
                    newStartTimeUtc
                })
            });
            const data = await res.json();
            
            if (data.success) {
                // Navigera tillbaka till hanteringssidan med framgång
                router.push(`/booking/manage/${appointmentId}?success=rescheduled`);
            } else {
                alert(data.error || "Ett fel uppstod vid ombokningen.");
                setIsRescheduling(false);
            }
        } catch (err) {
            console.error(err);
            alert("Ett fel uppstod.");
            setIsRescheduling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Header />
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-champagne-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-foreground/60 text-sm font-semibold">Förbereder ombokning...</p>
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
                    <h2 className="text-2xl font-bold text-foreground">Kunde inte starta ombokningen</h2>
                    <p className="text-foreground/40 text-sm">{error || "Kunde inte ladda dina uppgifter."}</p>
                </div>
                <Link href={`/booking/manage/${appointmentId}`} className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-sm">
                    Gå tillbaka
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 pt-32 pb-40 space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Link href={`/booking/manage/${appointmentId}`} className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground text-sm font-bold transition-colors">
                        <ArrowLeft size={16} />
                        Avbryt ombokning
                    </Link>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-heading font-black text-foreground tracking-tight">Välj en ny tid</h1>
                        <p className="text-foreground/60 mt-2 font-medium">Hitta en ledig tid för {appointment.service_name} hos {appointment.salon?.name}.</p>
                    </div>
                </div>

                {/* Calendar Area */}
                <div className="bg-card rounded-[32px] md:rounded-[40px] border border-border shadow-2xl overflow-hidden relative min-h-[600px]">
                    {availabilityError && (
                        <div className="p-4 bg-rose-500 text-white text-sm font-bold text-center">
                            Kunde inte ladda tider: {availabilityError}
                        </div>
                    )}
                    {availability.length === 0 && !availabilityError && (
                        <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
                            <CalendarIcon size={48} className="text-foreground/20 mb-4" />
                            <h3 className="text-xl font-bold text-foreground mb-2">Inga lediga tider hittades</h3>
                            <p className="text-foreground/60 text-sm max-w-md">Vi kunde tyvärr inte hitta några lediga tider för denna behandling framöver. Testa att kontakta salongen direkt.</p>
                        </div>
                    )}

                    <Calendar 
                        availability={availability}
                        onSelectSlot={handleSelectSlot}
                        hideAppointments={true}
                    />
                </div>
            </div>

            {/* Bottom Floating Confirmation Panel */}
            <AnimatePresence>
                {selectedSlot && (
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] pb-safe"
                    >
                        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 flex flex-col sm:flex-row items-center gap-6 justify-between">
                            <div className="flex-1 text-center sm:text-left">
                                <span className="text-[10px] font-black uppercase tracking-wider text-champagne-600 mb-1 block">Du bokar om till:</span>
                                <div className="text-xl md:text-2xl font-bold text-foreground capitalize flex items-center justify-center sm:justify-start gap-3">
                                    <CalendarIcon className="text-champagne-500 hidden sm:block" size={24} />
                                    <span>{selectedSlot.day} {selectedSlot.fullDate}</span>
                                    <span className="text-foreground/40">•</span>
                                    <span className="flex items-center gap-1.5"><Clock size={20} className="text-champagne-500"/> Kl {selectedSlot.time}</span>
                                </div>
                            </div>

                            <div className="flex w-full sm:w-auto gap-4">
                                <button
                                    onClick={() => setSelectedSlot(null)}
                                    className="flex-1 sm:flex-none px-6 py-4 rounded-2xl font-bold text-sm bg-card-deep hover:bg-card-deep/80 text-foreground transition-colors border border-border"
                                >
                                    Ångra
                                </button>
                                <button
                                    onClick={handleReschedule}
                                    disabled={isRescheduling}
                                    className="flex-[2] sm:flex-none px-8 py-4 rounded-2xl font-bold text-sm bg-champagne-500 hover:bg-champagne-600 text-white transition-all shadow-lg shadow-champagne-500/25 flex items-center justify-center"
                                >
                                    {isRescheduling ? 'Bokar om...' : 'Bekräfta Ombokning'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
