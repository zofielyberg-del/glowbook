'use client';

import { useState, useEffect } from "react";
import { Plus, Users, Calendar as CalendarIcon, Settings, Star, TrendingUp, Scissors, CreditCard, ArrowRight, Clock, CheckCircle2, Shield, Eye, MousePointerClick, BarChart3, Lightbulb, UserCheck, Trash2, ChevronDown, ChevronUp, Copy, Sparkles, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Calendar from "@/components/dashboard/Calendar";
import RevenueChart from "@/components/dashboard/RevenueChart";
import clsx from "clsx";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { format, getDay, startOfWeek, addDays } from "date-fns";
import { sv } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { PermissionGate } from "@/components/auth/PermissionGate";

const categoryGroups: Record<string, {
    name: string;
    examples: string[];
    tip: string;
    profileTip: string;
    welcomeMessage: string;
}> = {
    naglar: {
        name: "Nagelstudio",
        examples: ["Gelénaglar", "Förlängning", "Borttagning", "Påfyllning"],
        tip: "Håll 60–90 min slots för påfyllning för att garantera perfekt kvalitet.",
        profileTip: "Ladda upp en logga och berätta om dina certifieringar i nageldesign och hygien.",
        welcomeMessage: "Vi hjälper dig att sätta upp din nagelstudio på rätt sätt för nagelterapeuter."
    },
    frisor: {
        name: "Frisör & Hårvård",
        examples: ["Klippning", "Färgning", "Slingor", "Styling"],
        tip: "Lägg längre tider för färgbehandlingar och mer precision.",
        profileTip: "Lägg till en fin profilbild och berätta om din specialisering (t.ex. färgning eller herrklipp).",
        welcomeMessage: "Vi hjälper dig att strukturera din frisörsalong för optimala färg- och klippningstider."
    },
    skonhet: {
        name: "Lash, Brow & Skönhet",
        examples: ["Fransförlängning", "Brow lift", "Lash lift", "Färgning"],
        tip: "Blocka korta pauser mellan kunder pga hög precision under behandlingarna.",
        profileTip: "Berätta om dina utbildningar och visa upp din expertis inom fransar, bryn eller avancerad hudvård.",
        welcomeMessage: "Vi hjälper dig att anpassa din bokningssida för skönhets- och fransbehandlingar."
    },
    massage: {
        name: "Massage & Spa",
        examples: ["Helkroppsmassage", "Ryggmassage", "Ansiktsbehandling"],
        tip: "Lägg in 10-15 minuters återhämtningstid (clean-up slots) mellan dina bokningar.",
        profileTip: "Skapa en inbjudande beskrivning av din lugna miljö, dina massageoljor och din terapeutiska inriktning.",
        welcomeMessage: "Vi hjälper dig att planera dina massagebehandlingar för en harmonisk kundupplevelse."
    },
    general: {
        name: "Skönhet & Hälsa",
        examples: ["Standardbehandling", "Konsultation", "Expressbehandling"],
        tip: "Ställ in passande återhämtningstid mellan behandlingar så att du slipper stress.",
        profileTip: "Ladda upp en vacker logotyp och berätta för dina kunder vad som utmärker just din salong.",
        welcomeMessage: "Låt oss snabbt sätta upp din verksamhet på rätt sätt så att du kan ta emot dina första bokningar."
    }
};

const getCategoryGroup = (cat: any) => {
    if (!cat) return categoryGroups.general;
    let catStr = '';
    if (Array.isArray(cat)) {
        catStr = cat.join(' ');
    } else if (typeof cat === 'string') {
        catStr = cat;
    } else {
        try {
            catStr = JSON.stringify(cat);
        } catch {
            catStr = String(cat);
        }
    }
    const lower = catStr.toLowerCase();
    if (lower.includes('nagel') || lower.includes('nagl') || lower.includes('nail')) return categoryGroups.naglar;
    if (lower.includes('hår') || lower.includes('frisör') || lower.includes('barber') || lower.includes('hair')) return categoryGroups.frisor;
    if (lower.includes('frans') || lower.includes('bryn') || lower.includes('hud') || lower.includes('injektion') || lower.includes('lash') || lower.includes('brow') || lower.includes('skönhet') || lower.includes('makeup') || lower.includes('piercing')) return categoryGroups.skonhet;
    if (lower.includes('massage') || lower.includes('massör') || lower.includes('spa') || lower.includes('wellness') || lower.includes('fotvård')) return categoryGroups.massage;
    return categoryGroups.general;
};

export default function ProviderDashboard() {
    const router = useRouter();
    const { t, currency } = useLanguage();
    const [salonName, setSalonName] = useState('Ditt Salon');
    const [salonTier, setSalonTier] = useState('bas');
    const [practitioners, setPractitioners] = useState<any[]>([]);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'manual' | 'share'>('manual');
    const [generatedLink, setGeneratedLink] = useState('');
    const [bookingData, setBookingData] = useState({
        clientName: '',
        service: '',
        startTime: '10:00',
        date: format(new Date(), 'yyyy-MM-dd'),
        duration: 60
    });
    const [services, setServices] = useState<any[]>([]);
    const [salonCategory, setSalonCategory] = useState('');
    const [membershipStatus, setMembershipStatus] = useState<'active' | 'inactive'>('active');
    const [isLoading, setIsLoading] = useState(true);
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    const [cancellationNotice, setCancellationNotice] = useState<string | null>(null);

    // Onboarding Guide States
    const [isGuideMinimized, setIsGuideMinimized] = useState<boolean | null>(null);
    const [savingOnboarding, setSavingOnboarding] = useState(false);
    const [copied, setCopied] = useState(false);

    // Statistics derived from actual data
    const [stats, setStats] = useState({
        profileViews: 0,
        clicks: 0,
        bookings: 0,
        conversionRate: '0%',
        topService: '',
        topTime: '',
        newCustomers: 0,
    });
    const [dailyRevenue, setDailyRevenue] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

    const { user, isLoggedIn, isLoading: authLoading } = useAuth();

    // Sync Stripe Checkout session if returned from Stripe Checkout
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        const subscriptionParam = params.get('subscription');
        
        if (subscriptionParam === 'success' && sessionId) {
            console.log('[Sync] Found Stripe session_id in URL, triggering database sync...');
            
            // Clean up the URL so the query parameter is hidden from the user
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);

            // Call backend sync-session API
            fetch('/api/stripe/sync-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.salon) {
                    console.log('[Sync] Stripe session synced successfully!', data.salon);
                    
                    const updateStorage = (storage: Storage) => {
                        const cached = storage.getItem('glowbook_salon');
                        if (cached) {
                            try {
                                const parsed = JSON.parse(cached);
                                const updated = {
                                    ...parsed,
                                    subscription_status: data.salon.subscription_status,
                                    membership_tier: data.salon.membership_tier,
                                    stripe_subscription_id: data.salon.stripe_subscription_id
                                };
                                storage.setItem('glowbook_salon', JSON.stringify(updated));
                            } catch (e) {
                                console.error('Error parsing storage during sync:', e);
                            }
                        }
                    };
                    updateStorage(sessionStorage);
                    updateStorage(localStorage);
                    
                    // Trigger custom events to refresh dashboard components
                    window.dispatchEvent(new Event('glowbook_update'));
                    window.dispatchEvent(new Event('storage'));
                }
            })
            .catch(err => {
                console.error('[Sync] Failed to sync Stripe session:', err);
            });
        }
    }, []);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/auth/login');
            return;
        }

        const loadDashboardData = () => {
            const data = user;
            setSalonName(data.name || 'Ditt Salon');
            setSalonCategory(data.category || '');
            setSalonTier(data.tier?.toLowerCase() || 'bas');
            setPractitioners(data.practitioners || []);

            const storedProviders = localStorage.getItem('glowbook_providers');
            if (storedProviders && data.email) {
                const providersList = JSON.parse(storedProviders);
                const me = providersList.find((p: any) => p.email.toLowerCase() === data.email.toLowerCase());
                if (me) {
                    setMembershipStatus(me.status);
                }
            }

            if (data.services) {
                setServices(data.services);
            }
            if (data.appointments) {
                const apts = data.appointments;
                setAllAppointments(apts);

                // Calculate real statistics from appointments
                const confirmedApts = apts.filter((a: any) => a.status !== 'cancelled');
                const uniqueCustomers = new Set(confirmedApts.map((a: any) => a.clientName || a.customer_name)).size;

                // Top service & time calculation
                const serviceCounts: Record<string, number> = {};
                const timeCounts: Record<string, number> = {};
                const revenueByDay = [0, 0, 0, 0, 0, 0, 0];

                // Build a set of the last 7 days (Mon-Sun of the current week)
                const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));

                confirmedApts.forEach((a: any) => {
                    const serviceName = a.service_name || a.service;
                    if (serviceName) serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
                    
                    if (a.status === 'completed' || a.status === 'paid') {
                        // Compute day index from the appointment date (works for both local and DB appointments)
                        let aptDateStr = a.date || '';
                        if (!aptDateStr && a.start_time) {
                            try { aptDateStr = format(new Date(a.start_time), 'yyyy-MM-dd'); } catch {}
                        }
                        if (!aptDateStr && a.booking_date) {
                            try { aptDateStr = format(new Date(a.booking_date), 'yyyy-MM-dd'); } catch {}
                        }
                        const dayIdx = weekDates.indexOf(aptDateStr);
                        if (dayIdx !== -1) {
                            const price = Number(a.price || a.total_price || 0);
                            revenueByDay[dayIdx] += price;
                        }
                    }

                    const aptTime = a.startTime || (a.start_time ? format(new Date(a.start_time), 'HH:mm') : '');
                    if (aptTime) timeCounts[aptTime] = (timeCounts[aptTime] || 0) + 1;
                });

                const sortedServices = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]);
                const topService = sortedServices[0] ? sortedServices[0][0] : '';

                const sortedTimes = Object.entries(timeCounts).sort((a, b) => b[1] - a[1]);
                const topTime = sortedTimes[0] ? sortedTimes[0][0] : '';

                setDailyRevenue(revenueByDay);
                setStats(prev => ({
                    ...prev,
                    bookings: confirmedApts.length,
                    newCustomers: uniqueCustomers,
                    topService,
                    topTime,
                }));
            }
            setIsLoading(false);
        };

        loadDashboardData();
        window.addEventListener('glowbook_update', loadDashboardData);
        window.addEventListener('storage', loadDashboardData);
        return () => {
            window.removeEventListener('glowbook_update', loadDashboardData);
            window.removeEventListener('storage', loadDashboardData);
        };
    }, [user, authLoading, router]);

    // Onboarding progress calculations
    const step1Done = !!(user?.logo_url || user?.profileImage) && !!(user?.description);
    const step2Done = services && services.length > 0;
    const step3Done = Array.isArray(user?.availability) && user.availability.some((a: any) => a && a.startTime && a.duration);
    const step4Done = !!(user?.onboardingProgress?.sharedLink || user?.onboarding_progress?.sharedLink);
    const step5Done = !!user?.hasAppointments || (allAppointments && allAppointments.length > 0);

    const completedStepsCount = [step1Done, step2Done, step3Done, step4Done, step5Done].filter(Boolean).length;
    const progressPercent = Math.round((completedStepsCount / 5) * 100);

    // Auto-minimize guide when completed (100%), but let the user override
    useEffect(() => {
        if (!isLoading && !authLoading && isGuideMinimized === null) {
            const completedCount = [step1Done, step2Done, step3Done, step4Done, step5Done].filter(Boolean).length;
            setIsGuideMinimized(completedCount === 5);
        }
    }, [isLoading, authLoading, step1Done, step2Done, step3Done, step4Done, step5Done, isGuideMinimized]);

    const handleCopyBookingLink = async () => {
        const bookingLink = typeof window !== 'undefined' ? `${window.location.origin}/salon/${user?.slug || ''}` : '';
        
        try {
            await navigator.clipboard.writeText(bookingLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (err) {
            console.error("Failed to copy booking link to clipboard:", err);
        }

        setSavingOnboarding(true);

        const currentProgress = user?.onboardingProgress || user?.onboarding_progress || {};
        const updatedProgress = { ...currentProgress, sharedLink: true };

        try {
            const response = await fetch('/api/salons/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: user?.id,
                    onboardingProgress: updatedProgress
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.salon) {
                    const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        const merged = {
                            ...parsed,
                            onboarding_progress: updatedProgress,
                            onboardingProgress: updatedProgress
                        };
                        sessionStorage.setItem('glowbook_salon', JSON.stringify(merged));
                        localStorage.setItem('glowbook_salon', JSON.stringify(merged));
                        window.dispatchEvent(new Event('glowbook_update'));
                    }
                }
            }
        } catch (err) {
            console.error("Failed to save onboarding progress to database:", err);
        } finally {
            setSavingOnboarding(false);
        }
    };

    const handleCreateBooking = (e: React.FormEvent) => {
        e.preventDefault();

        if (modalMode === 'share') {
            const dateObj = new Date(bookingData.date);
            const dayIndex = (dateObj.getDay() + 6) % 7; // Convert to Mon-Sun (0-6)
            const url = `${window.location.origin}/salon?id=${salonName.toLowerCase().replace(/\s+/g, '-')}&booking=now&service=${encodeURIComponent(bookingData.service)}&day=${dayIndex}&time=${bookingData.startTime}`;
            setGeneratedLink(url);
            return;
        }

        const saved = localStorage.getItem('glowbook_salon');
        const data = saved ? JSON.parse(saved) : {};
        const appointments = data.appointments || [];

        const localStart = new Date(`${bookingData.date}T${bookingData.startTime}:00`);
        const start_time = localStart.toISOString();
        const end_time = new Date(localStart.getTime() + (bookingData.duration || 60) * 60000).toISOString();

        const newApt = {
            id: Date.now().toString(),
            ...bookingData,
            start_time,
            end_time,
            color: 'bg-pink-100/95 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800/60 text-pink-800 dark:text-pink-300 shadow-sm'
        };

        const updated = {
            ...data,
            appointments: [...appointments, newApt]
        };

        localStorage.setItem('glowbook_salon', JSON.stringify(updated));
        sessionStorage.setItem('glowbook_salon', JSON.stringify(updated));
        window.dispatchEvent(new Event('glowbook_update'));
        setIsBookingModalOpen(false);
        setBookingData({ clientName: '', service: '', startTime: '10:00', date: format(new Date(), 'yyyy-MM-dd'), duration: 60 });
    };

    const handleCancelAppointment = async (aptId: string) => {
        // 1. Sync deletion to database immediately using bypassPolicy
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

        // 2. Keep local sessionStorage & localStorage updated as fallback
        const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
        if (saved) {
            const data = JSON.parse(saved);
            const appointments = data.appointments || [];
            const apt = appointments.find((a: any) => a.id === aptId);
            const filtered = appointments.filter((a: any) => a.id !== aptId);
            const updated = { ...data, appointments: filtered };
            
            sessionStorage.setItem('glowbook_salon', JSON.stringify(updated));
            localStorage.setItem('glowbook_salon', JSON.stringify(updated));

            // Show cancellation notice
            const msg = (apt && apt.clientEmail)
                ? `Avbokning bekräftad. Ett mail har skickats till ${apt.clientEmail}`
                : `Bokningen har tagits bort.`;

            setCancellationNotice(msg);
            setTimeout(() => setCancellationNotice(null), 5000);
            
            setSalonName(updated.name);
        }

        // 3. Background fetch fresh data from server
        const savedData = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
        if (savedData) {
            const data = JSON.parse(savedData);
            if (data.id) {
                try {
                    const response = await fetch(`/api/salons/get?id=${data.id}&_t=${Date.now()}`);
                    const serverResult = await response.json();
                    if (serverResult.success) {
                        const currentSaved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon') || savedData;
                        const currentData = JSON.parse(currentSaved);
                        const lastMutation = localStorage.getItem('glowbook_last_mutation') || sessionStorage.getItem('glowbook_last_mutation');
                        const isRecentMutation = lastMutation && (Date.now() - Number(lastMutation) < 4000);
                        const merged = { 
                            ...currentData, 
                            ...serverResult.salon,
                            availability: isRecentMutation 
                                ? currentData.availability 
                                : (serverResult.salon.availability || currentData.availability)
                        };
                        sessionStorage.setItem('glowbook_salon', JSON.stringify(merged));
                        localStorage.setItem('glowbook_salon', JSON.stringify(merged));
                    }
                } catch (e) {}
            }
        }

        window.dispatchEvent(new Event('glowbook_update'));
    };

    const handleApproveAppointment = async (aptId: string) => {
        const saved = localStorage.getItem('glowbook_salon');
        if (!saved) return;
        const data = JSON.parse(saved);
        const appointments = data.appointments || [];

        const apt = appointments.find((a: any) => a.id === aptId);
        if (!apt) return;

        // 1. Optimistically update React state immediately so the UI reflects the change
        const updatedAppointments = appointments.map((a: any) =>
            a.id === aptId ? { ...a, status: 'completed' } : a
        );
        setAllAppointments(updatedAppointments);

        // Update revenue chart for the current week
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));
        let aptDateStr = apt.date || '';
        if (!aptDateStr && apt.start_time) {
            try { aptDateStr = format(new Date(apt.start_time), 'yyyy-MM-dd'); } catch {}
        }
        if (!aptDateStr && apt.booking_date) {
            try { aptDateStr = format(new Date(apt.booking_date), 'yyyy-MM-dd'); } catch {}
        }
        const dayIdx = weekDates.indexOf(aptDateStr);
        if (dayIdx !== -1 && apt.status !== 'completed' && apt.status !== 'paid') {
            setDailyRevenue(prev => {
                const next = [...prev];
                next[dayIdx] += Number(apt.price || apt.total_price || 0);
                return next;
            });
        }

        // 2. Sync completion to database and trigger feedback email
        try {
            await fetch('/api/bookings/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId: aptId })
            });
        } catch (e) {
            console.error('Failed to sync appointment completion to DB:', e);
        }

        // 3. Grant Loyalty Points if customer ID exists
        if (apt.customerId || apt.clientEmail) {
            try {
                await fetch('/api/loyalty/earn', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: apt.customerId,
                        email: apt.clientEmail,
                        salonId: data.id,
                        amount: apt.price || apt.total_price || 0,
                        bookingId: apt.id,
                        description: `Behandling: ${apt.service || apt.service_name}`
                    }),
                });
            } catch (e) {
                console.error('Failed to grant loyalty points:', e);
            }
        }

        // 4. Persist updated status to localStorage/sessionStorage
        const updated = { ...data, appointments: updatedAppointments };
        localStorage.setItem('glowbook_salon', JSON.stringify(updated));
        sessionStorage.setItem('glowbook_salon', JSON.stringify(updated));
        window.dispatchEvent(new Event('glowbook_update'));
    };

    const openBookingAt = (date: string, time: string) => {
        setBookingData({
            ...bookingData,
            date,
            startTime: time
        });
        setModalMode('manual');
        setIsBookingModalOpen(true);
    };

    const totalRevenue = allAppointments
        .filter((apt: any) => apt.status === 'completed' || apt.status === 'paid')
        .reduce((sum: number, apt: any) => sum + Number(apt.price || apt.total_price || 0), 0);

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const UPCOMING_TODAY = allAppointments
        .filter((apt: any) => {
            let aptDateStr = '';
            if (apt.date) {
                aptDateStr = apt.date;
            } else if (apt.start_time) {
                aptDateStr = format(new Date(apt.start_time), 'yyyy-MM-dd');
            } else if (apt.booking_date) {
                aptDateStr = format(new Date(apt.booking_date), 'yyyy-MM-dd');
            }
            return apt.status !== 'cancelled' && aptDateStr === todayStr;
        })
        .sort((a: any, b: any) => {
            const timeA = a.startTime || (a.start_time ? format(new Date(a.start_time), 'HH:mm') : '');
            const timeB = b.startTime || (b.start_time ? format(new Date(b.start_time), 'HH:mm') : '');
            return timeA.localeCompare(timeB);
        });

    const DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

    const isLuxe = salonTier === 'luxe';

    if (isLoading || authLoading) return null;

    return (
        <PermissionGate allowedRoles={['salon_owner', 'practitioner']}>
            <div className="min-h-screen bg-background transition-colors duration-300 relative">
                <Header />

                {/* Membership Lock Overlay */}
                <AnimatePresence>
                    {membershipStatus === 'inactive' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fixed inset-0 z-[200] flex items-center justify-center p-6"
                        >
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-xl" />
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="relative bg-card p-10 rounded-[40px] border border-border shadow-2xl max-w-lg w-full text-center space-y-8"
                            >
                                <div className="w-20 h-20 bg-red-50 dark:bg-red-950/30 rounded-3xl flex items-center justify-center mx-auto text-red-500">
                                    <Shield size={40} />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-heading font-bold text-foreground">Ditt medlemskap är låst</h2>
                                    <p className="text-foreground/50 leading-relaxed">
                                        Din testperiod har löpt ut eller så har en administratör avaktiverat ditt konto av säkerhetsskäl. Utförare kan inte själva aktivera tjänsten efter trial-perioden.
                                    </p>
                                </div>

                                <div className="bg-foreground/5 p-6 rounded-2xl text-left space-y-3">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Nästa steg</h4>
                                    <ul className="space-y-2 text-sm text-foreground/70">
                                        <li className="flex gap-2"><span>1.</span> Kontakta support för att aktivera abonnemang</li>
                                        <li className="flex gap-2"><span>2.</span> Slutför din betalning (via skickad faktura)</li>
                                        <li className="flex gap-2"><span>3.</span> Vänta på verifiering från Glow Admin</li>
                                    </ul>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <Link
                                        href="/support"
                                        className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-xl"
                                    >
                                        Kontakta Supporten
                                    </Link>
                                    <Link
                                        href="/"
                                        className="text-xs font-bold text-foreground/30 hover:text-foreground transition-colors"
                                    >
                                        Gå tillbaka till startsidan
                                    </Link>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Global Cancellation Notice */}
                <AnimatePresence>
                    {cancellationNotice && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] bg-red-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 font-bold text-sm border border-white/20"
                        >
                            <Trash2 size={18} />
                            <span>{cancellationNotice}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <main className="max-w-7xl mx-auto px-6 py-12 pt-24">
                    {/* Welcome Hero */}
                    <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-heading font-bold text-foreground">
                                    {t('dash_welcome')}, {salonName}!
                                </h1>
                                {isLuxe && (
                                    <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20">
                                        LUXE
                                    </span>
                                )}
                            </div>
                            <p className="text-foreground/50">{t('dash_overview')}</p>
                        </div>
                        <div className="flex gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsBookingModalOpen(true)}
                                className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-champagne-600 transition-all shadow-lg"
                            >
                                <Plus size={18} /> {t('dash_new_booking')}
                            </motion.button>
                        </div>
                    </div>

                    {/* Onboarding Get Started Guide */}
                    {isGuideMinimized !== null && (
                        isGuideMinimized ? (
                            <div className="bg-card border border-border shadow-md rounded-[2rem] p-6 mb-12 flex flex-col sm:flex-row justify-between items-center transition-all duration-300 gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-champagne-400/20 to-pink-400/20 border border-champagne-300/30 text-champagne-600 dark:text-champagne-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                                        {progressPercent === 100 ? <CheckCircle2 size={24} className="text-emerald-500" /> : <Sparkles size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground text-base">
                                            {progressPercent === 100 
                                                ? `🎉 Din ${getCategoryGroup(salonCategory || user?.category).name}-verksamhet är 100% redo för bokningar!` 
                                                : `Get Started: Din ${getCategoryGroup(salonCategory || user?.category).name}-guide (${progressPercent}% klart)`
                                            }
                                        </h3>
                                        <p className="text-xs text-foreground/50 mt-0.5">
                                            {progressPercent === 100 
                                                ? "Du har slutfört alla grundläggande steg. Bra jobbat!" 
                                                : "Följ din branschanpassade checklista för att komma igång snabbt."
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsGuideMinimized(false)}
                                    className="px-5 py-2.5 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-xl font-bold text-xs transition-all duration-300 flex items-center gap-1.5 shadow-sm active:scale-95"
                                >
                                    Visa onboarding-guide <ChevronDown size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-card/85 to-card/98 backdrop-blur-md border border-border shadow-xl rounded-[2.5rem] p-6 md:p-10 mb-12 relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-6 duration-500">
                                {/* Glowing luxury circle background */}
                                <div className="absolute -top-24 -right-24 w-64 h-64 bg-champagne-500/10 rounded-full blur-[100px] pointer-events-none" />
                                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />

                                <div className="flex justify-between items-start gap-4 mb-8">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-champagne-500/15 border border-champagne-500/20 text-champagne-600 dark:text-champagne-400 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                                                <Sparkles size={10} /> Get Started
                                            </span>
                                            <span className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">
                                                Anpassad för {getCategoryGroup(salonCategory || user?.category).name}
                                            </span>
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-heading font-black text-foreground mt-2">
                                            Kom igång med din verksamhet
                                        </h2>
                                        <p className="text-xs md:text-sm text-foreground/50">
                                            Följ de 5 stegen för att optimera din Glowbook-profil och börja ta emot bokningar direkt.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setIsGuideMinimized(true)}
                                        className="p-3 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground rounded-full transition-all shrink-0 hover:scale-105 active:scale-95"
                                        title="Minimera guiden"
                                    >
                                        <ChevronUp size={18} />
                                    </button>
                                </div>

                                {/* Progress bar section */}
                                <div className="space-y-3 mb-10">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-foreground/70">
                                            Din setup är {progressPercent}% klar
                                        </span>
                                        <span className="font-bold text-champagne-500">
                                            {completedStepsCount} av 5 steg avklarade
                                        </span>
                                    </div>
                                    <div className="w-full bg-foreground/5 h-3 rounded-full overflow-hidden relative border border-foreground/[0.03] shadow-inner p-[1px]">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPercent}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-champagne-400 via-pink-400 to-champagne-400 rounded-full shadow-[0_0_8px_rgba(244,197,154,0.4)]"
                                        />
                                    </div>
                                    <p className="text-[11px] text-foreground/40 italic">
                                        {progressPercent === 100 
                                            ? "Underbart! Du har slutfört alla steg och är redo att sköta din bokningssida." 
                                            : "Stegen bockas av automatiskt så fort du genomför aktiviteterna."
                                        }
                                    </p>
                                </div>

                                {/* Two-column layout */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left column: Checklist steps (Col-span 2) */}
                                    <div className="lg:col-span-2 space-y-4">
                                        {/* Step 1 */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-foreground/[0.01] border border-border/40 hover:border-champagne-300 dark:hover:border-champagne-500/20 hover:bg-foreground/[0.02] transition-all duration-300 gap-4 group/step">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-0.5 shrink-0">
                                                    {step1Done ? (
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
                                                            <CheckCircle2 size={16} className="animate-in scale-in duration-200" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-foreground/5 border border-border text-foreground/40 flex items-center justify-center font-bold text-xs">
                                                            1
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className={`font-bold text-sm ${step1Done ? 'text-foreground/40 line-through' : 'text-foreground'}`}>
                                                        Skapa profil
                                                    </h4>
                                                    <p className="text-xs text-foreground/50 leading-relaxed max-w-md">
                                                        Ladda upp din logotyp och berätta om din studio. {getCategoryGroup(salonCategory || user?.category).profileTip}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 self-end sm:self-center">
                                                {step1Done ? (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center gap-1">
                                                        <Check size={10} /> Klart
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href="/provider/settings"
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-md"
                                                    >
                                                        Redigera profil <ArrowRight size={12} />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-foreground/[0.01] border border-border/40 hover:border-champagne-300 dark:hover:border-champagne-500/20 hover:bg-foreground/[0.02] transition-all duration-300 gap-4 group/step">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-0.5 shrink-0">
                                                    {step2Done ? (
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
                                                            <CheckCircle2 size={16} className="animate-in scale-in duration-200" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-foreground/5 border border-border text-foreground/40 flex items-center justify-center font-bold text-xs">
                                                            2
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className={`font-bold text-sm ${step2Done ? 'text-foreground/40 line-through' : 'text-foreground'}`}>
                                                        Lägg till tjänster
                                                    </h4>
                                                    <p className="text-xs text-foreground/50 leading-relaxed max-w-md">
                                                        Lägg till behandlingar. För din bransch rekommenderar vi t.ex: <span className="font-medium text-foreground/70">{getCategoryGroup(salonCategory || user?.category).examples.join(', ')}</span>.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 self-end sm:self-center">
                                                {step2Done ? (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center gap-1">
                                                        <Check size={10} /> Klart
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href="/provider/services"
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-md"
                                                    >
                                                        Lägg till tjänst <ArrowRight size={12} />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-foreground/[0.01] border border-border/40 hover:border-champagne-300 dark:hover:border-champagne-500/20 hover:bg-foreground/[0.02] transition-all duration-300 gap-4 group/step">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-0.5 shrink-0">
                                                    {step3Done ? (
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
                                                            <CheckCircle2 size={16} className="animate-in scale-in duration-200" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-foreground/5 border border-border text-foreground/40 flex items-center justify-center font-bold text-xs">
                                                            3
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className={`font-bold text-sm ${step3Done ? 'text-foreground/40 line-through' : 'text-foreground'}`}>
                                                        Sätt schema & tillgänglighet
                                                    </h4>
                                                    <p className="text-xs text-foreground/50 leading-relaxed max-w-md">
                                                        Öppna lediga pass i kalendern så att kunder kan se när du är ledig för bokning.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 self-end sm:self-center">
                                                {step3Done ? (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center gap-1">
                                                        <Check size={10} /> Klart
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href="/provider/calendar"
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-md"
                                                    >
                                                        Sätt tillgänglighet <ArrowRight size={12} />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        {/* Step 4 */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-foreground/[0.01] border border-border/40 hover:border-champagne-300 dark:hover:border-champagne-500/20 hover:bg-foreground/[0.02] transition-all duration-300 gap-4 group/step">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-0.5 shrink-0">
                                                    {step4Done ? (
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
                                                            <CheckCircle2 size={16} className="animate-in scale-in duration-200" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-foreground/5 border border-border text-foreground/40 flex items-center justify-center font-bold text-xs">
                                                            4
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className={`font-bold text-sm ${step4Done ? 'text-foreground/40 line-through' : 'text-foreground'}`}>
                                                        Börja ta emot bokningar
                                                    </h4>
                                                    <p className="text-xs text-foreground/50 leading-relaxed max-w-md">
                                                        Din unika bokningssida är redo! Kopiera länken och lägg i t.ex. din Instagram-bio för att locka kunder.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 self-end sm:self-center">
                                                {step4Done ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center gap-1 font-bold">
                                                            <Check size={10} /> Delad
                                                        </span>
                                                        <button
                                                            onClick={handleCopyBookingLink}
                                                            className="text-[10px] font-bold text-foreground/40 hover:text-foreground hover:underline flex items-center gap-1"
                                                        >
                                                            {copied ? 'Kopierad! ⚡️' : 'Kopiera igen'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={handleCopyBookingLink}
                                                        disabled={savingOnboarding}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-champagne-400 to-pink-400 text-white rounded-full font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-md shadow-pink-500/10 hover:shadow-pink-500/25"
                                                    >
                                                        {copied ? 'Kopierad! ⚡️' : 'Kopiera länk'} <Copy size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Step 5 */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-foreground/[0.01] border border-border/40 hover:border-champagne-300 dark:hover:border-champagne-500/20 hover:bg-foreground/[0.02] transition-all duration-300 gap-4 group/step">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-0.5 shrink-0">
                                                    {step5Done ? (
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
                                                            <CheckCircle2 size={16} className="animate-in scale-in duration-200" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-foreground/5 border border-border text-foreground/40 flex items-center justify-center font-bold text-xs">
                                                            5
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className={`font-bold text-sm ${step5Done ? 'text-foreground/40 line-through' : 'text-foreground'}`}>
                                                        Hantera bokningar
                                                    </h4>
                                                    <p className="text-xs text-foreground/50 leading-relaxed max-w-md">
                                                        Gör din första manuella testbokning eller ta emot din första kundbokning för att slutföra onboarding.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 self-end sm:self-center">
                                                {step5Done ? (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center gap-1">
                                                        <Check size={10} /> Bokning klar!
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => setIsBookingModalOpen(true)}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-md"
                                                    >
                                                        Gör testbokning <ArrowRight size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right column: Industry assistant panel */}
                                    <div className="lg:col-span-1 space-y-6">
                                        {/* Custom setup helper box */}
                                        <div className="bg-foreground/[0.01] border border-border/80 rounded-3xl p-6 relative overflow-hidden space-y-5 flex flex-col h-full justify-between">
                                            <div className="space-y-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-champagne-500/10 border border-champagne-500/20 text-champagne-600 dark:text-champagne-400 rounded-xl flex items-center justify-center shadow-sm">
                                                        <Sparkles size={16} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground">Smart Onboarding</h4>
                                                        <p className="text-[10px] text-foreground/40 uppercase font-black tracking-widest">För {getCategoryGroup(salonCategory || user?.category).name}</p>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-foreground/60 leading-relaxed">
                                                    {getCategoryGroup(salonCategory || user?.category).welcomeMessage} Vi har ställt in rätt rekommendationer och standarder för din bransch.
                                                </p>

                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 block mb-1">
                                                        Rekommenderade Tjänster
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {getCategoryGroup(salonCategory || user?.category).examples.map((item, i) => (
                                                            <span 
                                                                key={i} 
                                                                className="px-2.5 py-1 bg-foreground/5 dark:bg-white/5 border border-border text-[10px] font-bold text-foreground/70 rounded-lg hover:border-champagne-300 dark:hover:border-champagne-500 transition-colors"
                                                            >
                                                                {item}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Pro tip card */}
                                            <div className="p-4 bg-gradient-to-br from-champagne-500/[0.04] to-pink-500/[0.04] border border-champagne-500/10 rounded-2xl space-y-2 mt-4 shrink-0">
                                                <div className="flex items-center gap-1.5 text-champagne-600 dark:text-champagne-400">
                                                    <Lightbulb size={16} />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Expert-tips</span>
                                                </div>
                                                <p className="text-[11px] text-foreground/60 leading-relaxed font-medium">
                                                    "{getCategoryGroup(salonCategory || user?.category).tip}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    {/* Quick Stats & Analytics Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                        {/* Stats Column */}
                        <div className="lg:col-span-1 grid grid-cols-1 gap-4">
                            {[
                                { label: t('dash_stat_bookings'), value: String(UPCOMING_TODAY.length), icon: CalendarIcon, color: 'text-blue-500' },
                                { label: t('dash_stat_customers'), value: String(stats.newCustomers), icon: Users, color: 'text-purple-500' },
                                { label: t('dash_stat_revenue'), value: `${totalRevenue} ${currency}`, icon: TrendingUp, color: 'text-green-500' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4 hover:border-champagne-300 transition-all">
                                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center bg-foreground/5", stat.color)}>
                                        <stat.icon size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest">{stat.label}</p>
                                        <p className="text-lg font-bold text-foreground">{stat.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Revenue Analytics Chart */}
                        <div className="lg:col-span-3 bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-foreground">Intäkter senaste 7 dagarna</h3>
                                    <p className="text-xs text-foreground/60 font-medium">Statistik baserad på dina faktiska bokningar</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-foreground">{totalRevenue} {currency}</div>
                                    <div className="text-[10px] text-foreground/30 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                                        <TrendingUp size={12} /> Realiserade intäkter
                                    </div>
                                </div>
                            </div>
                            <RevenueChart currency={currency} data={dailyRevenue} />
                        </div>
                    </div>

                    {/* Luxe: Statistik & Insikter */}
                    {isLuxe && (
                        <div className="mb-12 space-y-8">
                            {/* Stats Overview */}
                            <section className="bg-card p-8 rounded-3xl border border-border shadow-sm">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
                                        <BarChart3 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">Statistik & Insikter</h3>
                                        <p className="text-xs text-foreground/50">Förstå hur kunder hittar och bokar hos dig</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-100 dark:border-blue-900/20 space-y-2">
                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                            <Eye size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Profilvisningar</span>
                                        </div>
                                        <p className="text-3xl font-black text-blue-700 dark:text-blue-300">{stats.profileViews}</p>
                                        <p className="text-[10px] text-blue-600/60 dark:text-blue-400/60">senaste 30 dagar</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-100 dark:border-purple-900/20 space-y-2">
                                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                            <MousePointerClick size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Klick</span>
                                        </div>
                                        <p className="text-3xl font-black text-purple-700 dark:text-purple-300">{stats.clicks}</p>
                                        <p className="text-[10px] text-purple-600/60 dark:text-purple-400/60">senaste 30 dagar</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-100 dark:border-emerald-900/20 space-y-2">
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                            <CalendarIcon size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Bokningar</span>
                                        </div>
                                        <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{stats.bookings}</p>
                                        <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60">senaste 30 dagar</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-100 dark:border-amber-900/20 space-y-2">
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                            <TrendingUp size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Konvertering</span>
                                        </div>
                                        <p className="text-3xl font-black text-amber-700 dark:text-amber-300">{stats.conversionRate}</p>
                                        <p className="text-[10px] text-amber-600/60 dark:text-amber-400/60">visning → bokning</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="p-5 rounded-2xl bg-foreground/[0.02] border border-border space-y-3">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                                            <Star size={14} className="text-champagne-500" /> Mest bokade tjänst
                                        </h4>
                                        <p className="text-lg font-bold text-foreground">{stats.topService || 'Inga bokningar ännu'}</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-foreground/[0.02] border border-border space-y-3">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                                            <Clock size={14} className="text-pink-500" /> Populärast tid
                                        </h4>
                                        <p className="text-lg font-bold text-foreground">{stats.topTime || 'Ingen data ännu'}</p>
                                    </div>
                                </div>

                                {/* Smart Tips */}
                                <div className="p-6 rounded-2xl bg-gradient-to-br from-champagne-50/50 to-amber-50/30 dark:from-champagne-950/20 dark:to-amber-950/10 border border-champagne-100 dark:border-champagne-900/20 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Lightbulb size={18} className="text-champagne-600 dark:text-champagne-400" />
                                        <h4 className="text-sm font-bold text-foreground">Tips för din verksamhet</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-champagne-500 mt-2 shrink-0"></div>
                                            <p className="text-sm text-foreground/60">
                                                <span className="font-bold text-foreground/80">Engagera dina kunder.</span> Skapa en länk till lediga tider för att snabbare fylla ut ditt schema.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-champagne-500 mt-2 shrink-0"></div>
                                            <p className="text-sm text-foreground/60">
                                                <span className="font-bold text-foreground/80">Håll din profil uppdaterad.</span> Utförare med uppdaterade bilder och beskrivningar drar till sig fler kunder.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Luxe: Personalhantering (Staff) */}
                            <section className="bg-card p-8 rounded-3xl border border-border shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-foreground">Personalhantering</h3>
                                            <p className="text-xs text-foreground/50">Hantera ditt team och deras scheman</p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/provider/settings?tab=practitioners"
                                        className="px-5 py-2.5 bg-foreground text-background rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
                                    >
                                        <Settings size={14} /> Hantera
                                    </Link>
                                </div>

                                {practitioners.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {practitioners.map((p: any) => {
                                            const activeDays = p.schedule
                                                ? Object.values(p.schedule).filter((d: any) => d.active !== false).length
                                                : 0;
                                            return (
                                                <div key={p.id} className="p-5 rounded-2xl border border-border bg-foreground/[0.02] hover:border-blue-200 dark:hover:border-blue-900/30 transition-all group">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
                                                            {p.name.charAt(0)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-foreground truncate">{p.name}</h4>
                                                            <p className="text-xs text-foreground/40">{p.title || p.role || 'Utförare'}</p>
                                                            {p.categories && p.categories.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {p.categories.map((cat: string) => (
                                                                        <span key={cat} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 text-[8px] font-bold rounded uppercase tracking-wider">
                                                                            {cat}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {p.verified && (
                                                            <div className="p-1 bg-blue-500 text-white rounded-full">
                                                                <UserCheck size={12} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={clsx(
                                                                "w-2 h-2 rounded-full",
                                                                activeDays > 0 ? "bg-emerald-500" : "bg-red-400"
                                                            )}></div>
                                                            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                                                                {activeDays > 0 ? `${activeDays} dagar/vecka` : 'Inget schema'}
                                                            </span>
                                                        </div>
                                                        {(salonTier as string) !== 'bas' && (
                                                            <Link
                                                                href="/provider/settings?tab=practitioners"
                                                                className="text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                Redigera →
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 bg-foreground/[0.02] rounded-2xl border border-dashed border-border group relative overflow-hidden">
                                        <div className="w-14 h-14 bg-foreground/5 rounded-full flex items-center justify-center text-foreground/20">
                                            <Users size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-foreground">Ingen personal tillagd</p>
                                            <p className="text-xs text-foreground/40">
                                                {(salonTier as string) === 'bas'
                                                    ? 'Uppgradera din plan för att kunna lägga till personal.'
                                                    : 'Lägg till ditt team via Inställningar'}
                                            </p>
                                        </div>
                                        {(salonTier as string) === 'bas' ? (
                                            <Link
                                                href="/provider/settings?tab=membership"
                                                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                            >
                                                <Star size={12} className="fill-white" /> Uppgradera till Pro/Luxe
                                            </Link>
                                        ) : (
                                            <Link
                                                href="/provider/settings?tab=practitioners"
                                                className="px-6 py-3 bg-foreground text-background rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                                            >
                                                Lägg till personal
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Navigation & Today's Schedule */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Today's Schedule */}
                            <section className="bg-card p-8 rounded-3xl border border-border shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
                                        <Clock size={20} className="text-champagne-500" /> Kommande idag
                                    </h3>
                                    <div className="text-xs font-bold text-foreground/30 uppercase tracking-widest capitalize">
                                        {format(new Date(), 'EEEE, d MMM', { locale: sv })}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {UPCOMING_TODAY.map((item) => (
                                        <div key={item.id} className={`group flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-4 bg-background rounded-2xl border ${item.status === 'cancelled' ? 'border-red-500/30 opacity-60' : 'border-border/50 hover:border-champagne-300'} transition-all gap-4 sm:gap-6`}>
                                            <div className="flex items-start gap-4">
                                                <div className="text-sm font-black text-foreground/60 min-w-[3rem] mt-0.5">{item.startTime}</div>
                                                <div className={`w-1 h-10 ${item.status === 'cancelled' ? 'bg-red-500/50' : 'bg-champagne-500'} rounded-full shrink-0`} />
                                                <div className="min-w-0 flex-1">
                                                    <h4 className={`font-bold text-sm ${item.status === 'cancelled' ? 'text-red-500 dark:text-red-400 line-through' : 'text-foreground'} truncate`}>{item.clientName || item.customer_name || 'Kund'}</h4>
                                                    <p className="text-[10px] font-medium text-foreground/60 mt-0.5 truncate">{item.service || item.service_name || 'Tjänst'}</p>
                                                    <div className="flex flex-col xs:flex-row xs:items-center gap-1.5 xs:gap-3 mt-2">
                                                        <span className="text-[9px] text-foreground/45 flex items-center gap-1 min-w-0">
                                                            <Eye size={10} className="text-blue-400 shrink-0" /> <span className="truncate">{item.clientEmail || item.customer_email || 'Ingen e-post'}</span>
                                                        </span>
                                                        <span className="text-[9px] text-foreground/45 flex items-center gap-1 shrink-0">
                                                            <MousePointerClick size={10} className="text-emerald-400 shrink-0" /> {item.clientPhone || item.customer_phone || 'Inget nummer'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end sm:justify-start gap-3 w-full sm:w-auto border-t border-foreground/5 sm:border-t-0 pt-3 sm:pt-0 shrink-0">
                                                {item.status === 'cancelled' ? (
                                                    <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1">
                                                        <Trash2 size={12} /> Avbokad
                                                    </span>
                                                ) : item.status === 'completed' ? (
                                                    <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1">
                                                        <CheckCircle2 size={12} /> Betald
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleApproveAppointment(item.id)}
                                                        className="w-full sm:w-auto px-5 py-2.5 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-95 text-center"
                                                    >
                                                        Markera som klar
                                                    </button>
                                                )}
                                                <button className="hidden sm:block p-2 hover:bg-foreground/5 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                                    <ArrowRight size={16} className="text-foreground/30" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Link href="/provider/customers" className="group bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl hover:border-champagne-300 dark:hover:border-champagne-500 transition-all flex flex-col justify-between min-h-[200px]">
                                    <div>
                                        <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center text-champagne-600 dark:text-champagne-400 mb-6 group-hover:scale-110 transition-transform border border-border">
                                            <Users size={24} />
                                        </div>
                                        <h3 className="text-xl font-bold text-foreground mb-2">{t('dash_nav_customers')}</h3>
                                        <p className="text-sm text-foreground/50">{t('dash_nav_customers_desc')}</p>
                                    </div>
                                    <div className="flex items-center text-champagne-600 dark:text-champagne-400 font-bold text-sm mt-4">
                                        {t('action_manage_customers')} <ArrowRight size={16} className="ml-2" />
                                    </div>
                                </Link>

                                <Link href="/provider/services" className="group bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl hover:border-champagne-300 dark:hover:border-champagne-500 transition-all flex flex-col justify-between min-h-[200px]">
                                    <div>
                                        <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center text-champagne-600 dark:text-champagne-400 mb-6 group-hover:scale-110 transition-transform border border-border">
                                            <Scissors size={24} />
                                        </div>
                                        <h3 className="text-xl font-bold text-foreground mb-2">{t('dash_nav_services')}</h3>
                                        <p className="text-sm text-foreground/50">{t('dash_nav_services_desc')}</p>
                                    </div>
                                    <div className="flex items-center text-champagne-600 dark:text-champagne-400 font-bold text-sm mt-4">
                                        {t('action_edit_menu')} <ArrowRight size={16} className="ml-2" />
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Right Column: Calendar Preview */}
                        <div className="bg-card rounded-3xl p-8 text-foreground shadow-xl border border-border h-[600px] flex flex-col transition-all lg:sticky lg:top-24">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-xl font-bold">{t('dash_bookings_title')}</h3>
                                    <p className="text-xs text-foreground/50 mt-1">Fullständig överblick</p>
                                </div>
                                <div className="flex gap-2">
                                    <Link href="/provider/calendar" className="flex items-center gap-2 bg-black/5 dark:bg-white/5 text-black dark:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all border border-black/5 dark:border-white/5">
                                        <CalendarIcon size={14} className="text-champagne-500" />
                                        <span>{t('cal_go_to')}</span>
                                    </Link>
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden">
                                <Calendar onSelectSlot={openBookingAt} onCancelAppointment={handleCancelAppointment} />
                            </div>

                            <div className="mt-8">
                                {/* Reset tips & waitlist */}
                                <button
                                    className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-champagne-600 hover:text-white transition-all active:scale-95 shadow-2xl"
                                    onClick={() => {
                                        setModalMode('share');
                                        setGeneratedLink('');
                                        setIsBookingModalOpen(true);
                                    }}
                                >
                                    Skapa länk till ledig tid
                                </button>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Create Booking Modal */}
                <AnimatePresence>
                    {isBookingModalOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsBookingModalOpen(false)}
                                className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100]"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden border border-border"
                            >
                                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] p-8 flex justify-between items-center text-white">
                                    <div>
                                        <h3 className="text-2xl font-bold">{modalMode === 'share' ? 'Dela ledig tid' : 'Skapa ny bokning'}</h3>
                                        <p className="text-white/50 text-xs">{modalMode === 'share' ? 'Generera en länk för dina sociala medier' : 'Lägg till en kund manuellt i kalendern'}</p>
                                    </div>
                                    <button onClick={() => setIsBookingModalOpen(false)} className="hover:rotate-90 transition-transform"><Plus size={24} className="rotate-45" /></button>
                                </div>

                                <form onSubmit={handleCreateBooking} className="p-8 space-y-6">
                                    {generatedLink && modalMode === 'share' ? (
                                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                            <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-[2rem] text-center space-y-4">
                                                <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">Länken är redo!</p>
                                                    <p className="text-xs text-foreground/50">Dela denna i din Instagram-bio eller stories.</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <input
                                                    readOnly
                                                    type="text"
                                                    value={generatedLink}
                                                    className="w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-border text-sm font-medium outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(generatedLink);
                                                        setIsBookingModalOpen(false);
                                                    }}
                                                    className="w-full py-4 bg-foreground text-background rounded-2xl font-bold text-sm hover:scale-[1.02] transition-transform"
                                                >
                                                    Kopiera Länk
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                {modalMode === 'manual' && (
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-2">Kundens Namn</label>
                                                        <input
                                                            required
                                                            type="text"
                                                            value={bookingData.clientName}
                                                            onChange={(e) => setBookingData({ ...bookingData, clientName: e.target.value })}
                                                            className="w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-champagne-500 outline-none transition-all placeholder:text-foreground/20"
                                                            placeholder="T.ex. Maria Nilsson"
                                                        />
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-2">Välj Tjänst</label>
                                                    <select
                                                        required
                                                        value={bookingData.service}
                                                        onChange={(e) => setBookingData({ ...bookingData, service: e.target.value })}
                                                        className={clsx(
                                                            "w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-champagne-500 outline-none transition-all",
                                                            bookingData.service ? "text-foreground" : "text-foreground/50"
                                                        )}
                                                    >
                                                        <option value="" className="bg-card text-foreground">Välj en tjänst...</option>
                                                        {services.map((s, i) => (
                                                            <option key={i} value={s.name} className="bg-card text-foreground">{s.name} ({s.duration} min)</option>
                                                        ))}
                                                        {services.length === 0 && <option value="Annan" className="bg-card text-foreground">Annan tjänst</option>}
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-2">Datum</label>
                                                        <input
                                                            required
                                                            type="date"
                                                            value={bookingData.date}
                                                            onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                                                            className="w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-champagne-500 outline-none transition-all text-foreground"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-2">Tid</label>
                                                        <input
                                                            required
                                                            type="time"
                                                            lang="sv-SE"
                                                            value={bookingData.startTime}
                                                            onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value })}
                                                            className="w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-champagne-500 outline-none transition-all text-foreground"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                className="w-full py-5 bg-foreground text-background rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-champagne-600 hover:text-white transition-all shadow-xl active:scale-95"
                                            >
                                                {modalMode === 'share' ? 'Generera Länk' : 'Bekräfta Bokning'}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </PermissionGate>
    );
}
