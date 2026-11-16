'use client';

import { useState } from "react";
import { Wallet, CreditCard, CheckCircle2, ShieldCheck, ArrowUpRight, BarChart3, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

// Mock Toggle
const HAS_FINANCE_DATA = false;

// Mock Transactions
const MOCK_TRANSACTIONS = [
    { id: '1', customer: 'Anna Svensson', service: 'Gellack Nytt set', amount: 550, date: '2024-02-11', method: 'klarna', status: 'completed' },
];

export default function FinancePage() {
    const { t, currency } = useLanguage();
    const { user } = useAuth();
    const transactions = HAS_FINANCE_DATA ? MOCK_TRANSACTIONS : [];

    const isStripeConnected = Boolean(user?.stripe_account_id || user?.stripeConnected);

    const totalRevenue = transactions.reduce((acc, tr) => tr.status === 'completed' ? acc + tr.amount : acc, 0);
    const pendingRevenue = transactions.reduce((acc, tr) => tr.status === 'pending' ? acc + tr.amount : acc, 0);

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
            <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
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

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Total Försäljning */}
                <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3">
                    <div className="flex justify-between items-center text-neutral-400">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">Total försäljning</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Wallet size={16} />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-light tracking-tight text-white">{totalRevenue} <span className="text-sm font-normal text-neutral-400">{currency}</span></p>
                        <p className="text-[11px] text-neutral-500 mt-1">{t('provider_total_sales') || 'Genomförda behandlingar'}</p>
                    </div>
                </div>

                {/* Bokningar i kö */}
                <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3">
                    <div className="flex justify-between items-center text-neutral-400">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">Bokningar i kö</span>
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <CreditCard size={16} />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-light tracking-tight text-white">{pendingRevenue} <span className="text-sm font-normal text-neutral-400">{currency}</span></p>
                        <p className="text-[11px] text-neutral-500 mt-1">{t('provider_pending_bookings') || 'Kommande reserverade tider'}</p>
                    </div>
                </div>

                {/* Nästa utbetalning */}
                <div className="p-6 rounded-2xl bg-[#141417] border border-[#C2A26A]/30 space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-center text-[#DFCA9B]">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">Nästa utbetalning</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C2A26A]/15 text-[#DFCA9B] border border-[#C2A26A]/30">
                            Stripe / Klarna
                        </span>
                    </div>
                    <div>
                        <p className="text-3xl font-light tracking-tight text-white">0 <span className="text-sm font-normal text-neutral-400">{currency}</span></p>
                        <p className="text-[11px] text-neutral-400 mt-1">Automatisk överföring till bankkonto</p>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            {!HAS_FINANCE_DATA ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-12 sm:p-16 text-center space-y-4">
                    <div className="w-14 h-14 bg-[#C2A26A]/10 text-[#C2A26A] rounded-2xl flex items-center justify-center mx-auto border border-[#C2A26A]/20">
                        <BarChart3 size={28} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-medium text-white">{t('provider_no_stats_yet') || 'Ingen statistik tillgänglig än'}</h2>
                        <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                            Här kommer du att se din försäljningsstatistik, intäkter från Stripe & Klarna samt fullständig transaktionshistorik så snart din första tjänst är genomförd.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-[#111114] rounded-2xl border border-white/[0.08] overflow-hidden divide-y divide-white/[0.05]">
                    <div className="p-4 px-6 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                        Transaktioner
                    </div>
                    {transactions.map((tr) => (
                        <div key={tr.id} className="p-4 px-6 flex items-center justify-between text-xs">
                            <div>
                                <p className="font-medium text-white">{tr.customer}</p>
                                <p className="text-neutral-500">{tr.service} · {tr.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium text-white">+{tr.amount} {currency}</p>
                                <p className="text-emerald-400 font-medium capitalize">{tr.status}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
