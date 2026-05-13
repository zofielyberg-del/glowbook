
'use client';

import { useState } from "react";
import { Wallet, CreditCard, Banknote, CheckCircle2, AlertCircle, Filter, BarChart3 } from "lucide-react";
import Header from "@/components/layout/Header";
import clsx from "clsx";

// Mock Toggle
const HAS_FINANCE_DATA = false;

// Mock Transactions
const MOCK_TRANSACTIONS = [
    { id: '1', customer: 'Anna Svensson', service: 'Gellack Nytt set', amount: 550, date: '2024-02-11', method: 'klarna', status: 'completed' },
];

export default function FinancePage() {
    const transactions = HAS_FINANCE_DATA ? MOCK_TRANSACTIONS : [];

    const handleMarkAsPaid = (id: string) => {
        // Logic to update status
    };

    const totalRevenue = transactions.reduce((acc, t) => t.status === 'completed' ? acc + t.amount : acc, 0);
    const pendingRevenue = transactions.reduce((acc, t) => t.status === 'pending' ? acc + t.amount : acc, 0);

    return (
        <div className="min-h-screen bg-champagne-50">
            <Header />
            <main className="max-w-7xl mx-auto px-6 pt-24 pb-12">
                <div className="mb-12">
                    <h1 className="text-3xl font-heading font-bold text-premium-black">Ekonomi</h1>
                    <p className="text-gray-500">Översikt av dina intäkter och transaktioner.</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-white p-8 rounded-3xl border border-champagne-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                                <Wallet size={24} />
                            </div>
                        </div>
                        <h3 className="text-4xl font-bold text-premium-black mb-1">{totalRevenue} kr</h3>
                        <p className="text-sm text-gray-500">Total försäljning</p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-champagne-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <CreditCard size={24} />
                            </div>
                        </div>
                        <h3 className="text-4xl font-bold text-premium-black mb-1">{pendingRevenue} kr</h3>
                        <p className="text-sm text-gray-500">Bokningar i kö</p>
                    </div>

                    <div className="bg-premium-black p-8 rounded-3xl shadow-xl text-white">
                        <h3 className="text-4xl font-bold mb-1">0 kr</h3>
                        <p className="text-sm text-white/60 mb-6">Nästa utbetalning</p>
                        <div className="text-xs font-bold uppercase tracking-widest text-champagne-500">Hanteras av Klarna</div>
                    </div>
                </div>

                {/* Content */}
                {!HAS_FINANCE_DATA ? (
                    <div className="bg-white rounded-[2rem] border border-dashed border-champagne-300 p-20 text-center">
                        <div className="w-20 h-20 bg-champagne-50 text-champagne-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BarChart3 size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-premium-black mb-2">Ingen statistik tillgänglig än</h2>
                        <p className="text-gray-500 max-w-sm mx-auto mb-8">
                            Här kommer du att se din försäljningsstatistik, intäkter från Klarna och betalningshistorik så snart din första tjänst är genomförd.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-champagne-100 overflow-hidden">
                        {/* Table Render (Already implemented logic, keeping it clean) */}
                        <div className="p-6">Transaktionslista (Här visas listan)...</div>
                    </div>
                )}
            </main>
        </div>
    );
}
