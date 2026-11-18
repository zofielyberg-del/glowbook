'use client';

import { useState, useEffect, useMemo } from "react";
import { 
    Wallet, 
    CreditCard, 
    CheckCircle2, 
    ShieldCheck, 
    ArrowUpRight, 
    BarChart3, 
    ShoppingBag, 
    Store, 
    Clock, 
    Sparkles,
    Calendar
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { toStockholmDate } from "@/lib/date";
import clsx from "clsx";

export default function FinancePage() {
    const { currency } = useLanguage();
    const { user } = useAuth();
    
    const [appointments, setAppointments] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'online' | 'onsite' | 'products'>('all');

    const isStripeConnected = Boolean(user?.stripe_account_id || user?.stripeConnected);

    // Load appointments/transactions from local cache and sync with server
    useEffect(() => {
        const loadFinanceData = () => {
            const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed.appointments) && parsed.appointments.length > 0) {
                        setAppointments(parsed.appointments);
                        return;
                    }
                } catch (e) {
                    console.error('Error parsing stored salon:', e);
                }
            }
            if (user?.appointments && Array.isArray(user.appointments)) {
                setAppointments(user.appointments);
            }
        };

        loadFinanceData();
        window.addEventListener('glowbook_update', loadFinanceData);
        window.addEventListener('storage', loadFinanceData);

        // Fetch live from server
        const salonId = user?.id || (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('glowbook_salon') || '{}').id);
        if (salonId) {
            fetch(`/api/salons/get?id=${salonId}&_t=${Date.now()}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.salon?.appointments) {
                        setAppointments(data.salon.appointments);
                    }
                })
                .catch(err => console.error('Failed fetching live finance appointments:', err));
        }

        return () => {
            window.removeEventListener('glowbook_update', loadFinanceData);
            window.removeEventListener('storage', loadFinanceData);
        };
    }, [user?.id, user?.appointments]);

    // Helpers
    const isProductOrder = (item: any) => {
        if (!item) return false;
        const name = (item.service || item.service_name || '').toLowerCase();
        return name.startsWith('produktorder') || name.includes('produktorder') || item.type === 'product_order' || item.isProductOrder === true;
    };

    const getPaymentCategory = (method?: string | null): 'online' | 'onsite' | 'giftcard' => {
        if (!method) return 'onsite';
        const m = method.toLowerCase();
        if (m.includes('stripe') || m.includes('klarna') || m.includes('card') || m.includes('kort') || m.includes('paid') || m.includes('online')) {
            return 'online';
        }
        if (m.includes('giftcard') || m.includes('presentkort')) {
            return 'giftcard';
        }
        return 'onsite';
    };

    const getPaymentLabel = (method?: string | null) => {
        if (!method) return 'Betalas på plats i salong';
        const m = method.toLowerCase();
        if (m.includes('stripe') || m.includes('klarna') || m.includes('card') || m.includes('kort') || m.includes('paid') || m.includes('online')) {
            return 'Stripe & Klarna (Online)';
        }
        if (m.includes('giftcard') || m.includes('presentkort')) {
            return 'Presentkort';
        }
        return 'Betalas på plats i salong';
    };

    // Parse and normalize transactions
    const transactions = useMemo(() => {
        return appointments.map((apt: any) => {
            const isProd = isProductOrder(apt);
            const price = Number(apt.price || apt.total_price || 0);
            const method = apt.payment_method || apt.paymentMethod || 'onsite';
            const category = getPaymentCategory(method);
            const label = getPaymentLabel(method);

            let dateObj: Date | null = null;
            if (apt.start_time) dateObj = new Date(apt.start_time);
            else if (apt.booking_date) dateObj = new Date(apt.booking_date);
            else if (apt.date) dateObj = new Date(`${apt.date}T12:00:00`);
            else dateObj = new Date();

            return {
                id: apt.id || Math.random().toString(),
                customer: apt.customer_name || apt.clientName || 'Kund',
                email: apt.customer_email || apt.clientEmail || '',
                phone: apt.customer_phone || apt.clientPhone || '',
                service: apt.service_name || apt.service || (isProd ? 'Produktorder' : 'Behandling'),
                amount: price,
                date: dateObj,
                method: label,
                category,
                rawMethod: method,
                isProduct: isProd,
                status: apt.status || 'confirmed'
            };
        }).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    }, [appointments]);

    // Financial Computations
    const nonCancelled = useMemo(() => transactions.filter(t => t.status !== 'cancelled'), [transactions]);

    const totalRevenue = useMemo(() => {
        return nonCancelled.reduce((sum, tr) => sum + tr.amount, 0);
    }, [nonCancelled]);

    const onlineRevenue = useMemo(() => {
        return nonCancelled.filter(tr => tr.category === 'online').reduce((sum, tr) => sum + tr.amount, 0);
    }, [nonCancelled]);

    const onsiteRevenue = useMemo(() => {
        return nonCancelled.filter(tr => tr.category === 'onsite').reduce((sum, tr) => sum + tr.amount, 0);
    }, [nonCancelled]);

    const pendingRevenue = useMemo(() => {
        return nonCancelled.filter(tr => tr.status === 'confirmed').reduce((sum, tr) => sum + tr.amount, 0);
    }, [nonCancelled]);

    const pendingCount = useMemo(() => {
        return nonCancelled.filter(tr => tr.status === 'confirmed').length;
    }, [nonCancelled]);

    // Filtered transaction list
    const filteredTransactions = useMemo(() => {
        if (filter === 'online') return transactions.filter(t => t.category === 'online');
        if (filter === 'onsite') return transactions.filter(t => t.category === 'onsite');
        if (filter === 'products') return transactions.filter(t => t.isProduct);
        return transactions;
    }, [transactions, filter]);

    const hasData = transactions.length > 0;

    return (
        <div className="p-5 sm:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="space-y-1.5 pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C2A26A]">
                        Ekonomi · Utbetalningar
                    </span>
                </div>
                <h1 
                    className="text-3xl sm:text-4xl font-normal text-white tracking-tight"
                    style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif' }}
                >
                    Ekonomi & Transaktioner
                </h1>
                <p className="text-xs text-neutral-400">
                    Översikt av dina intäkter, bokningar i kö och automatiska utbetalningar via Stripe och Klarna.
                </p>
            </div>

            {/* Stripe & Klarna Integration Banner */}
            <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#C2A26A]/10 border border-[#C2A26A]/20 flex items-center justify-center text-[#C2A26A] shrink-0">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">
                                {isStripeConnected ? 'Stripe & Klarna aktivt' : 'Stripe & Klarna'}
                            </span>
                            <span className={isStripeConnected 
                                ? "px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-amber-500/15 text-[#DFCA9B] border border-amber-500/30"
                            }>
                                {isStripeConnected ? 'Kopplad' : 'Ej ansluten'}
                            </span>
                        </div>
                        <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
                            {isStripeConnected 
                                ? 'Dina digitala utbetalningar sker automatiskt direkt till ditt bankkonto. Automatisk kortgaranti och BankID-verifiering skyddar din salong mot no-shows.'
                                : 'Koppla ditt Stripe-konto för att aktivera no-show-skydd, kortgaranti vid bokning och direkta utbetalningar till ditt bankkonto.'}
                        </p>
                    </div>
                </div>

                <Link
                    href="/provider/settings?tab=payments"
                    className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#DFCA9B] border border-white/[0.08] text-xs font-medium flex items-center justify-center gap-2 transition-colors shrink-0"
                >
                    <span>{isStripeConnected ? 'Hantera Stripe' : 'Koppla Stripe nu'}</span>
                    <ArrowUpRight size={14} />
                </Link>
            </div>

            {/* Summary KPI Cards (4 columns for complete financial clarity) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Total Försäljning */}
                <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3 relative overflow-hidden group hover:border-[#C2A26A]/30 transition-all">
                    <div className="flex justify-between items-center text-neutral-400">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">Total försäljning</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Wallet size={16} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                            {totalRevenue.toLocaleString('sv-SE')} <span className="text-sm font-normal text-neutral-400">{currency}</span>
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                            {nonCancelled.length} {nonCancelled.length === 1 ? 'genomförd/aktiv' : 'genomförda/aktiva'}
                        </p>
                    </div>
                </div>

                {/* Bokningar & Ordrar i kö */}
                <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3 relative overflow-hidden group hover:border-[#C2A26A]/30 transition-all">
                    <div className="flex justify-between items-center text-neutral-400">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">Bokningar i kö</span>
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                            {pendingRevenue.toLocaleString('sv-SE')} <span className="text-sm font-normal text-neutral-400">{currency}</span>
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                            {pendingCount} {pendingCount === 1 ? 'kommande tid/upphämtning' : 'kommande tider/upphämtningar'}
                        </p>
                    </div>
                </div>

                {/* Nästa utbetalning via Stripe / Klarna */}
                <div className="p-6 rounded-2xl bg-[#141417] border border-[#C2A26A]/30 space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-center text-[#DFCA9B]">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">Online (Stripe)</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C2A26A]/15 text-[#DFCA9B] border border-[#C2A26A]/30">
                            Stripe / Klarna
                        </span>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                            {onlineRevenue.toLocaleString('sv-SE')} <span className="text-sm font-normal text-neutral-400">{currency}</span>
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-1">Automatisk överföring till bankkonto</p>
                    </div>
                </div>

                {/* Betalas på plats i salong */}
                <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3 relative overflow-hidden group hover:border-[#C2A26A]/30 transition-all">
                    <div className="flex justify-between items-center text-neutral-400">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">Betalas på plats</span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-[#DFCA9B] border border-amber-500/20">
                            <Store size={16} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                            {onsiteRevenue.toLocaleString('sv-SE')} <span className="text-sm font-normal text-neutral-400">{currency}</span>
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-1">Kort, Swish eller kontant i salong</p>
                    </div>
                </div>
            </div>

            {/* TRANSACTIONS SECTION */}
            {!hasData ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-12 sm:p-16 text-center space-y-4">
                    <div className="w-14 h-14 bg-[#C2A26A]/10 text-[#C2A26A] rounded-2xl flex items-center justify-center mx-auto border border-[#C2A26A]/20">
                        <BarChart3 size={28} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-medium text-white">Ingen statistik tillgänglig än</h2>
                        <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                            Här kommer du att se din försäljningsstatistik, intäkter från Stripe & Klarna samt fullständig transaktionshistorik så snart din första tjänst eller produktorder registreras.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-[#111114] rounded-2xl border border-white/[0.08] overflow-hidden">
                    {/* Filter Tabs Header */}
                    <div className="p-4 sm:p-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                                Transaktionshistorik
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.04] text-neutral-300 border border-white/[0.06]">
                                {transactions.length} st
                            </span>
                        </div>

                        {/* Quick filter pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                onClick={() => setFilter('all')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                                    filter === 'all'
                                        ? "bg-[#C2A26A] text-[#0B0B0C] font-semibold"
                                        : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.06]"
                                )}
                            >
                                Alla ({transactions.length})
                            </button>
                            <button
                                onClick={() => setFilter('online')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                                    filter === 'online'
                                        ? "bg-[#C2A26A] text-[#0B0B0C] font-semibold"
                                        : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.06]"
                                )}
                            >
                                Stripe & Klarna ({transactions.filter(t => t.category === 'online').length})
                            </button>
                            <button
                                onClick={() => setFilter('onsite')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                                    filter === 'onsite'
                                        ? "bg-[#C2A26A] text-[#0B0B0C] font-semibold"
                                        : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.06]"
                                )}
                            >
                                På plats ({transactions.filter(t => t.category === 'onsite').length})
                            </button>
                            <button
                                onClick={() => setFilter('products')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                                    filter === 'products'
                                        ? "bg-[#C2A26A] text-[#0B0B0C] font-semibold"
                                        : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.06]"
                                )}
                            >
                                Produktordrar ({transactions.filter(t => t.isProduct).length})
                            </button>
                        </div>
                    </div>

                    {/* Transaction List */}
                    <div className="divide-y divide-white/[0.05]">
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.map((tr) => {
                                const isCancelled = tr.status === 'cancelled';
                                const isCompleted = tr.status === 'completed';

                                return (
                                    <div 
                                        key={tr.id} 
                                        className={clsx(
                                            "p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
                                            isCancelled ? "opacity-40" : "hover:bg-white/[0.02]"
                                        )}
                                    >
                                        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-neutral-400 shrink-0 mt-0.5 sm:mt-0">
                                                {tr.isProduct ? <ShoppingBag size={15} className="text-[#DFCA9B]" /> : <Calendar size={15} className="text-neutral-400" />}
                                            </div>
                                            <div className="min-w-0 space-y-0.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className={clsx("text-sm font-medium", isCancelled ? "line-through text-neutral-400" : "text-white")}>
                                                        {tr.customer}
                                                    </p>
                                                    {tr.isProduct && (
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-[#C2A26A]/15 text-[#DFCA9B] border border-[#C2A26A]/30 shrink-0">
                                                            Upphämtning
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-neutral-400 truncate">
                                                    {tr.service}
                                                </p>
                                                <p className="text-[10px] text-neutral-400">
                                                    {tr.date ? format(toStockholmDate(tr.date), 'EEEE d MMMM yyyy, HH:mm', { locale: sv }) : 'Registrerad'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t border-white/[0.04] sm:border-t-0">
                                            {/* Payment Method Badge */}
                                            <div className="text-left sm:text-right">
                                                <span className={clsx(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border",
                                                    tr.category === 'online'
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : "bg-white/[0.04] text-[#DFCA9B] border-white/[0.08]"
                                                )}>
                                                    <CreditCard size={11} className="shrink-0" />
                                                    {tr.method}
                                                </span>
                                            </div>

                                            {/* Price & Status */}
                                            <div className="text-right min-w-[90px]">
                                                <p className="text-sm font-semibold text-white">
                                                    +{tr.amount.toLocaleString('sv-SE')} {currency}
                                                </p>
                                                <p className="text-[10px] uppercase tracking-wider font-semibold mt-0.5">
                                                    {isCancelled ? (
                                                        <span className="text-red-400">Avbokad</span>
                                                    ) : isCompleted ? (
                                                        <span className="text-emerald-400">{tr.isProduct ? 'Utlämnad' : 'Genomförd'}</span>
                                                    ) : (
                                                        <span className="text-neutral-400">{tr.isProduct ? 'Inväntar upphämtning' : 'Bokad / I kö'}</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center text-xs text-neutral-500">
                                Inga transaktioner matchade det valda filtret.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
