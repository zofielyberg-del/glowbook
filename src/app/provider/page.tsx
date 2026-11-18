'use client';

import { useState, useEffect } from "react";
import { 
    CreditCard, 
    Clock, 
    CheckCircle2, 
    Copy, 
    Check, 
    TrendingUp, 
    ShieldCheck, 
    Pause, 
    Shield, 
    Trash2, 
    Phone, 
    Mail, 
    ArrowUpRight,
    Sparkles,
    ShoppingBag,
    Package,
    X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RevenueChart from "@/components/dashboard/RevenueChart";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfWeek } from "date-fns";
import { sv } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { toStockholmDate, getStockholmDate } from "@/lib/date";
import clsx from "clsx";

export default function ProviderDashboard() {
    const router = useRouter();
    const { currency } = useLanguage();
    const { user, isLoggedIn, isLoading: authLoading } = useAuth();

    const [salonName, setSalonName] = useState('Salong');
    const [services, setServices] = useState<any[]>([]);
    const [membershipStatus, setMembershipStatus] = useState<'active' | 'inactive'>('active');
    const [isLoading, setIsLoading] = useState(true);
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    const [cancellationNotice, setCancellationNotice] = useState<string | null>(null);

    // Modal & Quick Action States
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'manual' | 'share'>('manual');
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);

    const [bookingData, setBookingData] = useState({
        clientName: '',
        service: '',
        startTime: '10:00',
        date: format(toStockholmDate(), 'yyyy-MM-dd'),
        duration: 60
    });

    const [dailyRevenue, setDailyRevenue] = useState<number[]>(() => Array(30).fill(0));
    const [revenueLabels, setRevenueLabels] = useState<string[]>([]);

    // Sync Stripe Checkout session if returned from Stripe Checkout
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        const subscriptionParam = params.get('subscription');
        
        if (subscriptionParam === 'success' && sessionId) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);

            fetch('/api/stripe/sync-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.salon) {
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
                    window.dispatchEvent(new Event('glowbook_update'));
                    window.dispatchEvent(new Event('storage'));
                }
            })
            .catch(err => {
                console.error('Failed to sync Stripe session:', err);
            });
        }
    }, []);

    useEffect(() => {
        if (authLoading) return;
        if (!user && !isLoggedIn) {
            router.push('/auth/login');
            return;
        }

        const loadDashboardData = () => {
            const data = user;
            if (data) {
                setSalonName(data.name || 'Salong');

                const storedProviders = localStorage.getItem('glowbook_providers');
                if (storedProviders && data.email) {
                    try {
                        const providersList = JSON.parse(storedProviders);
                        const me = providersList.find((p: any) => p.email?.toLowerCase() === data.email.toLowerCase());
                        if (me) {
                            setMembershipStatus(me.status);
                        }
                    } catch {}
                }

                if (data.services) {
                    setServices(data.services);
                }

                if (data.appointments) {
                    const apts = data.appointments;
                    setAllAppointments(apts);

                    const confirmedApts = apts.filter((a: any) => a.status !== 'cancelled' && a.status !== 'pending_payment');
                    const revenueByDay = Array(30).fill(0);
                    const today = toStockholmDate();
                    const last30DaysDates = Array.from({ length: 30 }, (_, i) => {
                        const d = addDays(today, -29 + i);
                        return format(d, 'yyyy-MM-dd');
                    });

                    confirmedApts.forEach((a: any) => {
                        let aptDateStr = a.date || '';
                        if (!aptDateStr && a.start_time) {
                            try { aptDateStr = format(toStockholmDate(new Date(a.start_time)), 'yyyy-MM-dd'); } catch {}
                        }
                        if (!aptDateStr && a.booking_date) {
                            try { aptDateStr = format(toStockholmDate(new Date(a.booking_date)), 'yyyy-MM-dd'); } catch {}
                        }
                        const dayIdx = last30DaysDates.indexOf(aptDateStr);
                        if (dayIdx !== -1) {
                            const price = Number(a.price || a.total_price || 0);
                            revenueByDay[dayIdx] += price;
                        }
                    });

                    const labels = last30DaysDates.map(dateStr => {
                        const d = new Date(`${dateStr}T12:00:00`);
                        return format(d, 'd MMM', { locale: sv });
                    });

                    setDailyRevenue(revenueByDay);
                    setRevenueLabels(labels);
                }
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
    }, [user, authLoading, isLoggedIn, router]);

    const handleCopyBookingLink = async () => {
        const bookingLink = typeof window !== 'undefined' ? `${window.location.origin}/salon/${user?.slug || ''}` : '';
        try {
            await navigator.clipboard.writeText(bookingLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (err) {
            console.error("Failed to copy booking link:", err);
        }
    };

    const handleCreateBooking = async (e: React.FormEvent) => {
        e.preventDefault();

        if (modalMode === 'share') {
            const dateObj = toStockholmDate(new Date(`${bookingData.date}T12:00:00`));
            const dayIndex = (dateObj.getDay() + 6) % 7;
            const salonSlug = (user as any)?.slug || salonName.toLowerCase().trim().replace(/[åäæ]/g, 'a').replace(/[öø]/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const url = `${window.location.origin}/${salonSlug}?booking=now&service=${encodeURIComponent(bookingData.service)}&day=${dayIndex}&time=${bookingData.startTime}`;
            setGeneratedLink(url);
            return;
        }

        const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
        const data = saved ? JSON.parse(saved) : {};
        const appointments = data.appointments || [];

        const matchedService = services.find((s: any) => s.name === bookingData.service);
        const durationMins = Number(bookingData.duration || matchedService?.duration || matchedService?.duration_minutes || 60);
        const servicePrice = Number(matchedService?.sale_price ?? matchedService?.price ?? 0);

        const startUtc = getStockholmDate(bookingData.date, bookingData.startTime);
        const start_time = startUtc.toISOString();
        const end_time = new Date(startUtc.getTime() + durationMins * 60000).toISOString();

        const nameParts = (bookingData.clientName || 'Kund').trim().split(' ');
        const firstName = nameParts[0] || 'Kund';
        const lastName = nameParts.slice(1).join(' ') || '';

        let dbAppointmentId = Date.now().toString();
        if (data.id) {
            try {
                const res = await fetch('/api/bookings/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        salonId: data.id,
                        serviceId: matchedService?.id,
                        serviceName: bookingData.service || 'Bokad tid / Paus',
                        practitionerId: 'owner',
                        startTime: bookingData.startTime,
                        date: bookingData.date,
                        duration: durationMins,
                        price: servicePrice,
                        customerInfo: {
                            firstName,
                            lastName,
                            email: `manual-${Date.now()}@noemail.glowbook.se`,
                            phone: '-',
                            isLoggedIn: false
                        },
                        paymentMethod: 'onsite',
                        status: 'confirmed',
                        start_time,
                        end_time
                    })
                });
                const resJson = await res.json();
                if (!res.ok) {
                    alert(resJson.error || 'Kunde inte spara tiden.');
                    return;
                }
                if (resJson.appointmentId) dbAppointmentId = resJson.appointmentId;
            } catch (err) {
                console.error('Failed persisting booking:', err);
            }
        }

        const newApt = {
            id: dbAppointmentId,
            ...bookingData,
            duration: durationMins,
            price: servicePrice,
            status: 'confirmed',
            start_time,
            end_time
        };

        const updated = {
            ...data,
            appointments: [...appointments, newApt]
        };

        localStorage.setItem('glowbook_salon', JSON.stringify(updated));
        sessionStorage.setItem('glowbook_salon', JSON.stringify(updated));
        window.dispatchEvent(new Event('glowbook_update'));
        setIsBookingModalOpen(false);
        setBookingData({ clientName: '', service: '', startTime: '10:00', date: format(toStockholmDate(), 'yyyy-MM-dd'), duration: 60 });
    };

    const handleCancelAppointment = async (aptId: string) => {
        try {
            const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
            const salonData = saved ? JSON.parse(saved) : {};
            await fetch('/api/bookings/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    appointmentId: aptId, 
                    bypassPolicy: true,
                    providerId: user?.id || salonData?.owner_id || salonData?.id 
                })
            });
        } catch (e) {
            console.error('Failed to sync cancellation:', e);
        }

        const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
        if (saved) {
            const data = JSON.parse(saved);
            const appointments = data.appointments || [];
            const filtered = appointments.filter((a: any) => a.id !== aptId);
            const updated = { ...data, appointments: filtered };
            
            sessionStorage.setItem('glowbook_salon', JSON.stringify(updated));
            localStorage.setItem('glowbook_salon', JSON.stringify(updated));

            setCancellationNotice("Bokningen har tagits bort från schemat.");
            setTimeout(() => setCancellationNotice(null), 5000);
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

        const updatedAppointments = appointments.map((a: any) =>
            a.id === aptId ? { ...a, status: 'completed' } : a
        );
        setAllAppointments(updatedAppointments);

        const weekStart = startOfWeek(toStockholmDate(), { weekStartsOn: 1 });
        const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));
        let aptDateStr = apt.date || '';
        if (!aptDateStr && apt.start_time) {
            try { aptDateStr = format(toStockholmDate(new Date(apt.start_time)), 'yyyy-MM-dd'); } catch {}
        }
        if (!aptDateStr && apt.booking_date) {
            try { aptDateStr = format(toStockholmDate(new Date(apt.booking_date)), 'yyyy-MM-dd'); } catch {}
        }
        const dayIdx = weekDates.indexOf(aptDateStr);
        if (dayIdx !== -1 && apt.status !== 'completed' && apt.status !== 'paid') {
            setDailyRevenue(prev => {
                const next = [...prev];
                next[dayIdx] += Number(apt.price || apt.total_price || 0);
                return next;
            });
        }

        try {
            await fetch('/api/bookings/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId: aptId })
            });
        } catch (e) {
            console.error('Failed to sync appointment completion:', e);
        }

        const updated = { ...data, appointments: updatedAppointments };
        localStorage.setItem('glowbook_salon', JSON.stringify(updated));
        sessionStorage.setItem('glowbook_salon', JSON.stringify(updated));
        window.dispatchEvent(new Event('glowbook_update'));
    };

    const todayStr = format(toStockholmDate(), 'yyyy-MM-dd');

    const UPCOMING_TODAY = allAppointments
        .filter((apt: any) => {
            let aptDateStr = '';
            if (apt.date) {
                aptDateStr = apt.date;
            } else if (apt.start_time) {
                aptDateStr = format(toStockholmDate(new Date(apt.start_time)), 'yyyy-MM-dd');
            } else if (apt.booking_date) {
                aptDateStr = format(toStockholmDate(new Date(apt.booking_date)), 'yyyy-MM-dd');
            }
            return apt.status !== 'cancelled' && aptDateStr === todayStr;
        })
        .sort((a: any, b: any) => {
            const timeA = a.startTime || (a.start_time ? format(toStockholmDate(new Date(a.start_time)), 'HH:mm') : '');
            const timeB = b.startTime || (b.start_time ? format(toStockholmDate(new Date(b.start_time)), 'HH:mm') : '');
            return timeA.localeCompare(timeB);
        });

    const isProductOrder = (item: any) => {
        if (!item) return false;
        const name = (item.service || item.service_name || '').toLowerCase();
        return name.startsWith('produktorder') || name.includes('produktorder') || item.type === 'product_order' || item.isProductOrder === true;
    };

    const getPaymentMethodInfo = (method?: string | null) => {
        if (!method) return { label: 'Betalas på plats i salong', isPaidOnline: false, isGiftCard: false };
        const m = method.toLowerCase();
        if (m.includes('stripe') || m.includes('klarna') || m.includes('card') || m.includes('kort') || m.includes('paid') || m.includes('online')) {
            return { label: 'Betald online (Kort/Klarna)', isPaidOnline: true, isGiftCard: false };
        }
        if (m.includes('giftcard') || m.includes('presentkort')) {
            return { label: 'Betald med Presentkort', isPaidOnline: true, isGiftCard: true };
        }
        return { label: 'Betalas på plats i salong', isPaidOnline: false, isGiftCard: false };
    };

    const isBankIdVerified = (item: any) => {
        if (!item || isProductOrder(item)) return false;
        return Boolean(item.bankid_verified || item.is_bankid_verified);
    };

    const productOrdersCount = UPCOMING_TODAY.filter(isProductOrder).length;
    const treatmentsCount = UPCOMING_TODAY.length - productOrdersCount;

    const nextCustomer = UPCOMING_TODAY.find((apt: any) => apt.status !== 'completed' && apt.status !== 'cancelled');

    const todayRevenue = UPCOMING_TODAY.reduce((sum: number, apt: any) => {
        if (apt.status === 'cancelled') return sum;
        const price = Number(apt.price || apt.total_price || 0);
        return sum + price;
    }, 0);

    const totalRevenue = dailyRevenue.reduce((sum, val) => sum + val, 0);

    const getGreeting = () => {
        const hour = toStockholmDate().getHours();
        if (hour < 9) return 'God morgon';
        if (hour < 12) return 'God förmiddag';
        if (hour < 17) return 'God eftermiddag';
        return 'God kväll';
    };

    if (isLoading || authLoading) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-[#C2A26A] border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-5 sm:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
            
            {/* Membership Paused Notice */}
            <AnimatePresence>
                {membershipStatus === 'inactive' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-3"
                    >
                        <Shield size={28} className="mx-auto text-red-400" />
                        <h2 className="text-lg font-serif font-medium text-white">Medlemskapet är pausat</h2>
                        <p className="text-xs text-neutral-400 max-w-md mx-auto">
                            Din testperiod har löpt ut eller så är ditt konto under granskning. Vänligen kontakta support för att återaktivera.
                        </p>
                        <Link
                            href="/support"
                            className="inline-block px-5 py-2.5 bg-[#C2A26A] text-[#0B0B0C] font-semibold text-xs tracking-wider uppercase rounded-xl hover:bg-[#DFCA9B] transition-colors"
                        >
                            Kontakta Support
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cancellation Notice Toast */}
            <AnimatePresence>
                {cancellationNotice && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 right-6 z-[300] bg-[#16161A] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs border border-white/[0.1]"
                    >
                        <Trash2 size={15} className="text-red-400" />
                        <span>{cancellationNotice}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Header Bar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-white/[0.06]">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C2A26A]">
                            Översikt
                        </span>
                    </div>
                    <h1 
                        className="text-3xl sm:text-4xl font-normal text-white tracking-tight"
                        style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif' }}
                    >
                        {getGreeting()}, {salonName}
                    </h1>
                    <p className="text-xs text-neutral-400 capitalize">
                        {format(toStockholmDate(), 'EEEE, d MMMM yyyy', { locale: sv })}
                        {' · '}
                        {treatmentsCount > 0 && (
                            <span>{treatmentsCount} {treatmentsCount === 1 ? 'bokning' : 'bokningar'} schemalagda</span>
                        )}
                        {treatmentsCount > 0 && productOrdersCount > 0 && <span>, </span>}
                        {productOrdersCount > 0 && (
                            <span className="text-[#DFCA9B]">{productOrdersCount} {productOrdersCount === 1 ? 'produktorder för upphämtning' : 'produktordrar för upphämtning'}</span>
                        )}
                        {treatmentsCount === 0 && productOrdersCount === 0 && (
                            <span>0 bokningar schemalagda idag</span>
                        )}
                    </p>
                </div>

                {/* Quick Actions (Strictly no "+ Ny bokning" in header) */}
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={handleCopyBookingLink}
                        className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] text-xs font-medium flex items-center gap-2 transition-all active:scale-95"
                    >
                        {copied ? <Check size={14} className="text-[#C2A26A]" /> : <Copy size={14} className="text-neutral-400" />}
                        <span>{copied ? 'Kopierad!' : 'Bokningslänk'}</span>
                    </button>
                    <button
                        onClick={() => {
                            setModalMode('manual');
                            setIsBookingModalOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#141417] hover:bg-[#1A1A1F] text-[#DFCA9B] border border-[#C2A26A]/30 text-xs font-medium flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                    >
                        <Pause size={14} className="text-[#C2A26A]" />
                        <span>Paus / Blocka tid</span>
                    </button>
                </div>
            </div>

            {/* KPI CARDS (Stripe Minimalist Aesthetics) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {/* Dagens Omsättning */}
                <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3 relative overflow-hidden group hover:border-[#C2A26A]/30 transition-all">
                    <div className="flex items-center justify-between text-neutral-400">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                            Dagens försäljning
                        </span>
                        <CreditCard size={18} strokeWidth={1.5} className="text-[#C2A26A]" />
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                            {todayRevenue.toLocaleString('sv-SE')} <span className="text-sm font-normal text-neutral-400">{currency}</span>
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                            {treatmentsCount > 0 && `${treatmentsCount} ${treatmentsCount === 1 ? 'bokning' : 'bokningar'}`}
                            {treatmentsCount > 0 && productOrdersCount > 0 && ' · '}
                            {productOrdersCount > 0 && `${productOrdersCount} ${productOrdersCount === 1 ? 'produktorder' : 'produktordrar'}`}
                            {treatmentsCount === 0 && productOrdersCount === 0 && '0 ordrar/bokningar idag'}
                        </p>
                    </div>
                </div>

                {/* Månadens Intäkter (30 dgr) */}
                <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3 relative overflow-hidden group hover:border-[#C2A26A]/30 transition-all">
                    <div className="flex items-center justify-between text-neutral-400">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                            Månadens intäkter
                        </span>
                        <TrendingUp size={18} strokeWidth={1.5} className="text-[#C2A26A]" />
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                            {totalRevenue.toLocaleString('sv-SE')} <span className="text-sm font-normal text-neutral-400">{currency}</span>
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                            Senaste 30 dagarna · Stripe & Klarna
                        </p>
                    </div>
                </div>

                {/* Snabb Direktlänk */}
                <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3 relative overflow-hidden group hover:border-[#C2A26A]/30 transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-neutral-400 mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                                Din bokningslänk
                            </span>
                            <Sparkles size={18} strokeWidth={1.5} className="text-[#C2A26A]" />
                        </div>
                        <p className="text-xs font-mono text-neutral-300 truncate">
                            glowbook.se/salon/{user?.slug || 'ditt-namn'}
                        </p>
                    </div>
                    <button
                        onClick={handleCopyBookingLink}
                        className="w-full mt-3 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-medium text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                        <Copy size={13} className="text-[#C2A26A]" />
                        <span>Kopiera länk för Instagram bio</span>
                    </button>
                </div>
            </div>

            {/* SPOTLIGHT: NÄSTA KUND / AKTUELL PRODUKTORDER */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                        {nextCustomer && isProductOrder(nextCustomer) ? 'Aktuell produktorder' : 'Nästa kund'}
                    </h2>
                    <Link 
                        href="/provider/calendar" 
                        className="text-xs text-[#C2A26A] hover:text-[#DFCA9B] font-medium flex items-center gap-1 transition-colors"
                    >
                        Gå till kalendern <ArrowUpRight size={13} />
                    </Link>
                </div>

                {nextCustomer ? (
                    (() => {
                        const isProd = isProductOrder(nextCustomer);
                        const payInfo = getPaymentMethodInfo(nextCustomer.payment_method || nextCustomer.paymentMethod);
                        const hasBankId = isBankIdVerified(nextCustomer);
                        const timeDisplay = nextCustomer.startTime || (nextCustomer.start_time ? format(toStockholmDate(new Date(nextCustomer.start_time)), 'HH:mm') : 'Idag');

                        return (
                            <div className="p-6 sm:p-7 rounded-2xl bg-[#121215] border border-[#C2A26A]/30 space-y-6 relative overflow-hidden shadow-xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#C2A26A]/15 text-[#DFCA9B] border border-[#C2A26A]/30">
                                                {isProd ? 'Produktorder · Upphämtning i salong' : 'Nästa besök'}
                                            </span>
                                            <span className="text-xs text-neutral-400 font-medium">
                                                Kl. {timeDisplay}
                                            </span>
                                        </div>
                                        <h3 
                                            className="text-2xl sm:text-3xl font-normal text-white pt-1"
                                            style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif' }}
                                        >
                                            {nextCustomer.clientName || nextCustomer.customer_name || 'Inbokad kund'}
                                        </h3>
                                        <p className="text-xs text-neutral-300">
                                            {nextCustomer.service || nextCustomer.service_name || (isProd ? 'Produktorder' : 'Behandling')}
                                            {!isProd && ` · ${nextCustomer.duration || 60} min`}
                                            {` · ${Number(nextCustomer.price || nextCustomer.total_price || 0).toLocaleString('sv-SE')} ${currency}`}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleApproveAppointment(nextCustomer.id)}
                                            className="px-5 py-2.5 rounded-xl bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] text-xs font-semibold tracking-wide uppercase transition-all shadow-md active:scale-95"
                                        >
                                            {isProd ? 'Markera som utlämnad' : 'Markera som klar'}
                                        </button>
                                        <button
                                            onClick={() => handleCancelAppointment(nextCustomer.id)}
                                            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-red-500/10 text-neutral-400 hover:text-red-400 border border-white/[0.08] text-xs font-medium transition-colors"
                                        >
                                            {isProd ? 'Avbryt order' : 'Avboka'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-neutral-400">
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-neutral-500 shrink-0" />
                                        <span className="text-neutral-300">{nextCustomer.clientPhone || nextCustomer.customer_phone || 'Inget telefonnummer angivet'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-neutral-500 shrink-0" />
                                        <span className="text-neutral-300 truncate">{nextCustomer.clientEmail || nextCustomer.customer_email || 'Ingen e-post'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CreditCard size={14} className={payInfo.isPaidOnline ? "text-emerald-400 shrink-0" : "text-[#C2A26A] shrink-0"} />
                                        <span className={payInfo.isPaidOnline ? "text-emerald-400 font-medium" : "text-[#DFCA9B] font-medium"}>
                                            Betalsätt: {payInfo.label}
                                        </span>
                                    </div>
                                    {hasBankId && (
                                        <div className="flex items-center gap-2 sm:col-span-3">
                                            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                                            <span className="text-emerald-400/90 font-medium">BankID verifierad</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <div className="p-8 rounded-2xl bg-[#111114] border border-white/[0.08] text-center space-y-3">
                        <Clock size={24} className="mx-auto text-neutral-500" strokeWidth={1.5} />
                        <div>
                            <p className="text-sm font-medium text-white">Inga fler bokningar schemalagda för idag</p>
                            <p className="text-xs text-neutral-500 mt-0.5">Dela din direktlänk i sociala medier för att fylla luckor i schemat.</p>
                        </div>
                    </div>
                )}
            </section>

            {/* DAGENS SCHEMA (Minimalist Timeline / Table) */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                        Dagens schema & ordrar
                    </h2>
                    <span className="text-xs text-neutral-500">
                        {UPCOMING_TODAY.length} {UPCOMING_TODAY.length === 1 ? 'aktiv händelse' : 'aktiva händelser'}
                    </span>
                </div>

                <div className="bg-[#111114] rounded-2xl border border-white/[0.08] overflow-hidden divide-y divide-white/[0.05]">
                    {UPCOMING_TODAY.length > 0 ? (
                        UPCOMING_TODAY.map((item) => {
                            const timeStr = item.startTime || (item.start_time ? format(toStockholmDate(new Date(item.start_time)), 'HH:mm') : '--:--');
                            const isCancelled = item.status === 'cancelled';
                            const isCompleted = item.status === 'completed';
                            const isProd = isProductOrder(item);
                            const payInfo = getPaymentMethodInfo(item.payment_method || item.paymentMethod);

                            return (
                                <div 
                                    key={item.id}
                                    className={clsx(
                                        "p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
                                        isCancelled ? "opacity-40" : "hover:bg-white/[0.02]"
                                    )}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="text-xs font-mono font-medium text-neutral-300 min-w-[50px]">
                                            {timeStr}
                                        </div>
                                        <div className="w-1 h-8 rounded-full bg-neutral-700 shrink-0" />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={clsx("text-sm font-medium truncate", isCancelled ? "line-through text-neutral-400" : "text-white")}>
                                                    {item.clientName || item.customer_name || 'Kund'}
                                                </p>
                                                {isProd && (
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-[#C2A26A]/15 text-[#DFCA9B] border border-[#C2A26A]/30 shrink-0">
                                                        Upphämtning
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-neutral-400 truncate">
                                                {item.service || item.service_name || 'Behandling'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t border-white/[0.04] sm:border-t-0">
                                        <div className="text-right">
                                            <span className="text-xs font-semibold text-neutral-200 block">
                                                {Number(item.price || item.total_price || 0).toLocaleString('sv-SE')} {currency}
                                            </span>
                                            <span className={clsx("text-[10px] block font-medium", payInfo.isPaidOnline ? "text-emerald-400/90" : "text-[#DFCA9B]")}>
                                                {payInfo.label}
                                            </span>
                                        </div>

                                        {isCancelled ? (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                                                Avbokad
                                            </span>
                                        ) : isCompleted ? (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                <CheckCircle2 size={12} /> {isProd ? 'Utlämnad' : 'Genomförd'}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleApproveAppointment(item.id)}
                                                className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-emerald-500/20 hover:text-emerald-300 text-neutral-300 text-[11px] font-medium border border-white/[0.08] transition-colors"
                                            >
                                                {isProd ? 'Markera utlämnad' : 'Markera som klar'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-xs text-neutral-500">
                            Inga bokningar schemalagda för idag.
                        </div>
                    )}
                </div>
            </section>

            {/* REVENUE ANALYTICS (30 Days) */}
            <section className="p-6 sm:p-8 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-base font-medium text-white">Intäkter senaste 30 dagarna</h3>
                        <p className="text-xs text-neutral-500">Faktiska utbetalningar och bokningar via Glowbook</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-xl font-light text-white">
                            {totalRevenue.toLocaleString('sv-SE')} <span className="text-xs text-neutral-400">{currency}</span>
                        </p>
                    </div>
                </div>
                <RevenueChart currency={currency} data={dailyRevenue} labels={revenueLabels} />
            </section>

            {/* MODAL: PAUS / BLOCKA TID & DELA LÄNK */}
            <AnimatePresence>
                {isBookingModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsBookingModalOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-lg bg-[#141417] rounded-3xl shadow-2xl z-[101] border border-white/[0.1] overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium text-white">
                                        {modalMode === 'share' ? 'Dela ledig tid' : 'Blocka tid / Manuell bokning'}
                                    </h3>
                                    <p className="text-xs text-neutral-400 mt-0.5">
                                        {modalMode === 'share' ? 'Skapa en direktlänk till dina sociala medier' : 'Reservera en lucka eller lägg in en kund i kalendern'}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setIsBookingModalOpen(false)}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.05]"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateBooking} className="p-6 space-y-5">
                                {generatedLink && modalMode === 'share' ? (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-center space-y-2">
                                            <CheckCircle2 size={24} className="mx-auto text-[#C2A26A]" />
                                            <p className="text-xs font-medium text-white">Bokningslänken är klar</p>
                                            <p className="text-[11px] text-neutral-400">Dela denna direkt till kunden eller i din Instagram Story.</p>
                                        </div>
                                        <input
                                            readOnly
                                            type="text"
                                            value={generatedLink}
                                            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/[0.1] text-xs font-mono text-neutral-300 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(generatedLink);
                                                setIsBookingModalOpen(false);
                                            }}
                                            className="w-full py-3 bg-[#C2A26A] text-[#0B0B0C] font-semibold text-xs tracking-wider uppercase rounded-xl hover:bg-[#DFCA9B] transition-colors"
                                        >
                                            Kopiera Länk
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                                Beskrivning / Kundens namn
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                value={bookingData.clientName}
                                                onChange={(e) => setBookingData({ ...bookingData, clientName: e.target.value })}
                                                placeholder="T.ex. Lunchpaus eller Maria Nilsson"
                                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                                Välj behandling / typ
                                            </label>
                                            <select
                                                value={bookingData.service}
                                                onChange={(e) => setBookingData({ ...bookingData, service: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl bg-[#16161A] border border-white/[0.08] text-xs text-white focus:border-[#C2A26A] outline-none"
                                            >
                                                <option value="">Välj typ...</option>
                                                <option value="Paus / Ej bokningsbar">Paus / Ej bokningsbar</option>
                                                {services.map((s, i) => (
                                                    <option key={i} value={s.name}>{s.name} ({s.duration} min)</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                                    Datum
                                                </label>
                                                <input
                                                    required
                                                    type="date"
                                                    value={bookingData.date}
                                                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:border-[#C2A26A] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                                    Klockslag
                                                </label>
                                                <input
                                                    required
                                                    type="time"
                                                    value={bookingData.startTime}
                                                    onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:border-[#C2A26A] outline-none"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full py-3.5 bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] font-semibold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md active:scale-95"
                                        >
                                            Spara i schemat
                                        </button>
                                    </div>
                                )}
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
