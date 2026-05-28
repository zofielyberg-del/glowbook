
'use client';

import Header from "@/components/layout/Header";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, Plus, ChevronLeft, Save, Trash2, CalendarDays } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Calendar from "@/components/dashboard/Calendar";
import Link from "next/link";
import clsx from "clsx";
import { format, addDays, startOfWeek } from "date-fns";
import { sv } from "date-fns/locale";

export default function CalendarPage() {
    const { t } = useLanguage();
    const [isPostingTimes, setIsPostingTimes] = useState(false);
    const [selectedFrames, setSelectedFrames] = useState<string[]>([]);
    const [frameTimes, setFrameTimes] = useState({ from: '09:00', to: '17:00' });
    const [slotType, setSlotType] = useState<'standard' | 'single'>('standard');
    const [lastUpdate, setLastUpdate] = useState(Date.now());
    const [selectedWeek, setSelectedWeek] = useState<string>(() => {
        return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    });

    const getWeekOptions = () => {
        const options = [];
        const now = new Date();
        
        // Start of current week (Monday)
        let monday = startOfWeek(now, { weekStartsOn: 1 });
        
        // Extended from 6 to 12 weeks to allow scheduling into July, August and beyond
        for (let i = 0; i < 12; i++) {
            const start = addDays(monday, i * 7);
            const end = addDays(start, 6);
            const weekNum = format(start, 'w', { locale: sv });
            const weekStr = format(start, 'yyyy-MM-dd');
            
            let label = `Vecka ${weekNum}: ${format(start, 'd MMM', { locale: sv })} – ${format(end, 'd MMM', { locale: sv })}`;
            if (i === 0) label = `Denna vecka (v.${weekNum}): ${format(start, 'd MMM', { locale: sv })} – ${format(end, 'd MMM', { locale: sv })}`;
            else if (i === 1) label = `Nästa vecka (v.${weekNum}): ${format(start, 'd MMM', { locale: sv })} – ${format(end, 'd MMM', { locale: sv })}`;
            
            options.push({ value: weekStr, label });
        }
        
        options.push({ value: 'recurring', label: 'Alla veckor (Återkommande)' });
        return options;
    };

    useEffect(() => {
        const handleUpdate = () => setLastUpdate(Date.now());
        window.addEventListener('glowbook_update', handleUpdate);
        return () => window.removeEventListener('glowbook_update', handleUpdate);
    }, []);

    const handleCancelAppointment = async (aptId: string) => {
        // 1. Keep local sessionStorage & localStorage updated immediately (Optimistic UI)
        const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
        let dataId: string | null = null;
        if (saved) {
            const data = JSON.parse(saved);
            dataId = data.id;
            const appointments = data.appointments || [];
            const filtered = appointments.filter((a: any) => a.id !== aptId);
            const updatedData = { ...data, appointments: filtered };
            
            sessionStorage.setItem('glowbook_salon', JSON.stringify(updatedData));
            localStorage.setItem('glowbook_salon', JSON.stringify(updatedData));
        }

        // 2. Dispatch event to update the UI instantly
        window.dispatchEvent(new Event('glowbook_update'));

        // 3. Trigger cancellation and background sync asynchronously
        (async () => {
            try {
                const res = await fetch('/api/bookings/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appointmentId: aptId, bypassPolicy: true })
                });
                const result = await res.json();
                if (!res.ok) {
                    console.warn('Database cancellation note:', result.error);
                }
            } catch (e) {
                console.error('Failed to sync database cancellation:', e);
            }

            // Background fetch fresh data from server to ensure everything is perfectly aligned
            if (dataId) {
                try {
                    const response = await fetch(`/api/salons/get?id=${dataId}&_t=${Date.now()}`);
                    const serverResult = await response.json();
                    if (serverResult.success) {
                        const currentSaved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
                        if (currentSaved) {
                            const currentData = JSON.parse(currentSaved);
                            const merged = { 
                                ...currentData, 
                                ...serverResult.salon,
                                availability: currentData.availability || serverResult.salon.availability
                            };
                            sessionStorage.setItem('glowbook_salon', JSON.stringify(merged));
                            localStorage.setItem('glowbook_salon', JSON.stringify(merged));
                            window.dispatchEvent(new Event('glowbook_update'));
                        }
                    }
                } catch (e) {}
            }
        })();
    };

    const WEEKDAYS = [
        { id: 'monday', label: t('day_monday') || 'Måndag', dayIndex: 0 },
        { id: 'tuesday', label: t('day_tuesday') || 'Tisdag', dayIndex: 1 },
        { id: 'wednesday', label: t('day_wednesday') || 'Onsdag', dayIndex: 2 },
        { id: 'thursday', label: t('day_thursday') || 'Torsdag', dayIndex: 3 },
        { id: 'friday', label: t('day_friday') || 'Fredag', dayIndex: 4 },
        { id: 'saturday', label: t('day_saturday') || 'Lördag', dayIndex: 5 },
        { id: 'sunday', label: t('day_sunday') || 'Söndag', dayIndex: 6 }
    ];

    const handleSaveSchedule = async () => {
        if (selectedFrames.length === 0) return;

        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        const data = saved ? JSON.parse(saved) : {};
        let updatedFrames = [...(data.availability || [])];

        for (const dayId of selectedFrames) {
            const dayData = WEEKDAYS.find(d => d.id === dayId);
            if (!dayData) continue;

            let duration = 0;
            let isSingleSlot = false;

            if (slotType === 'standard') {
                const [fromH, fromM] = frameTimes.from.split(':').map(Number);
                const [toH, toM] = frameTimes.to.split(':').map(Number);
                duration = (toH * 60 + toM) - (fromH * 60 + fromM);

                if (duration <= 0) {
                    alert(t('msg_invalid_time_range') || "Sluttid måste vara efter starttid");
                    return;
                }
            } else {
                isSingleSlot = true;
                duration = 40; // Default to 40 min for single slots to prevent 0px height cards, layout loops, and incorrect overlap checks
            }

            const newFrame = {
                id: (Date.now() + Math.random()).toString(),
                startTime: frameTimes.from,
                duration: duration,
                dayIndex: dayData.dayIndex,
                week: selectedWeek === 'recurring' ? undefined : selectedWeek,
                ...(isSingleSlot && { isSingleSlot: true })
            };
            
            updatedFrames.push(newFrame);
        }

        const updatedData = {
            ...data,
            availability: updatedFrames
        };

        // 1. Update localStorage & sessionStorage instantly (Optimistic UI)
        localStorage.setItem('glowbook_salon', JSON.stringify(updatedData));
        sessionStorage.setItem('glowbook_salon', JSON.stringify(updatedData));

        // 2. Dispatch event to update the same-tab calendar instantly
        window.dispatchEvent(new Event('glowbook_update'));

        // 3. Close the modal and reset day selection instantly!
        setIsPostingTimes(false);
        setSelectedFrames([]);

        // 4. Sync to server in the background (asynchronously)
        (async () => {
            try {
                const response = await fetch('/api/salons/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: data.id, availability: updatedFrames })
                });

                if (!response.ok) {
                    console.error('Failed to sync to server');
                }
            } catch (e) {
                console.error('Network error during sync:', e);
            }
        })();
    };

    return (
        <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
            <Header />

            <main className="flex-1 p-6 pt-24 grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-[1600px] mx-auto w-full">

                {/* Left Sidebar: Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-card rounded-3xl p-6 shadow-xl border border-border">
                        <Link href="/provider" className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground mb-6 transition-colors">
                            <ChevronLeft size={16} />
                            <span>{t('btn_back')}</span>
                        </Link>

                        <h1 className="text-2xl font-bold mb-2">{t('dash_bookings_title')}</h1>
                        <p className="text-sm text-gray-500 mb-8">{t('dash_overview')}</p>

                        <div className="space-y-3">
                            <button
                                onClick={() => setIsPostingTimes(true)}
                                className="w-full flex items-center justify-between p-4 bg-[#111] dark:bg-white text-white dark:text-[#111] rounded-2xl font-bold hover:scale-[1.02] transition-transform active:scale-95 shadow-lg shadow-black/10"
                            >
                                <div className="flex items-center gap-3">
                                    <Clock size={20} />
                                    <span>{t('cal_post_times')}</span>
                                </div>
                                <Plus size={18} />
                            </button>
                            {/* Manual bookings button removed */}
                        </div>
                    </div>

                    {/* Quick Info / Legend */}
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] rounded-3xl p-6 shadow-xl text-white">
                        <h3 className="font-bold mb-4 opacity-80 uppercase text-[10px] tracking-widest">Kategorier</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-pink-400"></div>
                                <span className="text-sm">Bokade tider</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                <span className="text-sm">Tillgängliga ramar</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                <span className="text-sm">Stängt</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Area: Calendar */}
                <div className="lg:col-span-3 h-full min-h-[800px]">
                    <Calendar onCancelAppointment={handleCancelAppointment} />
                </div>
            </main>

            {/* Modal: Post Times (Time Framing) */}
            <AnimatePresence>
                {isPostingTimes && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-card rounded-[40px] p-10 max-w-2xl w-full shadow-2xl border border-border relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-champagne-300 via-pink-200 to-champagne-300"></div>

                            <h2 className="text-3xl font-bold mb-2 text-foreground">{t('cal_post_times')}</h2>
                            <p className="text-foreground/50 mb-8">Välj vilka dagar och tider du vill vara tillgänglig för bokning.</p>

                            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                <button
                                    onClick={() => setSlotType('standard')}
                                    className={clsx(
                                        "flex-1 p-4 rounded-2xl border-2 transition-all text-left",
                                        slotType === 'standard' ? "border-champagne-500 bg-champagne-500/5 shadow-md" : "border-border hover:border-foreground/20"
                                    )}
                                >
                                    <div className="font-bold text-foreground mb-1">Standardpass</div>
                                    <div className="text-xs text-foreground/50">Öppna en lucka, t.ex. 09-17. Flera kunder kan boka.</div>
                                </button>
                                <button
                                    onClick={() => setSlotType('single')}
                                    className={clsx(
                                        "flex-1 p-4 rounded-2xl border-2 transition-all text-left",
                                        slotType === 'single' ? "border-champagne-500 bg-champagne-500/5 shadow-md" : "border-border hover:border-foreground/20"
                                    )}
                                >
                                    <div className="font-bold text-foreground mb-1 flex items-center gap-2">Enstaka Tid <span className="text-champagne-500">✨</span></div>
                                    <div className="text-xs text-foreground/50">Lås tiden efter 1 bokning, oavsett behandlingens längd.</div>
                                </button>
                            </div>

                            <AnimatePresence>
                                {slotType === 'single' && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3">
                                            <span className="text-blue-400 mt-0.5">💡</span>
                                            <p className="text-sm text-blue-400 font-medium">
                                                <strong>Exakt Biljett:</strong> Om du anger "11:00" skapas bara en tid. Så fort någon bokar 11:00 stängs tiden direkt, oavsett hur lång behandlingen är.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                                {WEEKDAYS.map(day => (
                                    <button
                                        key={day.id}
                                        onClick={() => {
                                            setSelectedFrames(prev => 
                                                prev.includes(day.id) 
                                                    ? prev.filter(id => id !== day.id) 
                                                    : [...prev, day.id]
                                            );
                                        }}
                                        className={clsx(
                                            "p-4 rounded-2xl text-sm font-bold border transition-all",
                                            selectedFrames.includes(day.id)
                                                ? "bg-[#111] dark:bg-white text-white dark:text-[#111] border-[#111] dark:border-white shadow-lg"
                                                : "bg-card text-foreground/40 border-border hover:border-champagne-300"
                                        )}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-8">
                                <label className="text-xs font-bold text-foreground/30 uppercase tracking-widest mb-2 block">Välj vecka</label>
                                <select
                                    value={selectedWeek}
                                    onChange={(e) => setSelectedWeek(e.target.value)}
                                    className="w-full p-4 bg-background border border-border rounded-2xl font-bold text-foreground focus:ring-2 focus:ring-champagne-300 outline-none appearance-none cursor-pointer"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 16px center',
                                        backgroundSize: '16px'
                                    }}
                                >
                                    {getWeekOptions().map(opt => (
                                        <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-10">
                                <div>
                                    <label className="text-xs font-bold text-foreground/30 uppercase tracking-widest mb-2 block">
                                        {slotType === 'single' ? 'Klockslag' : 'Från'}
                                    </label>
                                    <input
                                        type="time"
                                        lang="sv-SE"
                                        value={frameTimes.from}
                                        onChange={(e) => setFrameTimes(prev => ({ ...prev, from: e.target.value }))}
                                        className="w-full p-4 bg-background border border-border rounded-2xl font-bold text-foreground focus:ring-2 focus:ring-champagne-300 outline-none"
                                    />
                                </div>
                                
                                {slotType === 'standard' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                    >
                                        <label className="text-xs font-bold text-foreground/30 uppercase tracking-widest mb-2 block">Till</label>
                                        <input
                                            type="time"
                                            lang="sv-SE"
                                            value={frameTimes.to}
                                            onChange={(e) => setFrameTimes(prev => ({ ...prev, to: e.target.value }))}
                                            className="w-full p-4 bg-background border border-border rounded-2xl font-bold text-foreground focus:ring-2 focus:ring-champagne-300 outline-none"
                                        />
                                    </motion.div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsPostingTimes(false)}
                                    className="flex-1 py-5 bg-foreground/5 text-foreground/50 font-bold rounded-3xl hover:bg-foreground/10 transition-colors"
                                >
                                    {t('btn_back')}
                                </button>
                                <button
                                    onClick={handleSaveSchedule}
                                    className="flex-1 py-5 bg-[#111] dark:bg-white text-white dark:text-[#111] font-bold rounded-3xl hover:scale-[1.02] transition-transform shadow-xl shadow-black/20"
                                >
                                    {t('btn_save_schedule')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
