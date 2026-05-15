
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lock, CreditCard } from 'lucide-react';
import Link from 'next/link';

export function DashboardGuard({ children }: { children: React.ReactNode }) {
    const { user, isSalonOwner, isLoading } = useAuth();
    const [isLocked, setIsLocked] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (!isLoading && isSalonOwner && user) {
            // In a real app, we fetch the latest status from our API/DB
            // For now, we simulate the lock if subscription_status is 'past_due'
            // or if it's missing (and not in trial)

            const checkStatus = async () => {
                try {
                    // This should be a real fetch call to our backend
                    // const res = await fetch(`/api/salons/${user.id}/status`);
                    // const data = await res.json();

                    // For demo/dev, we check sessionStorage but prepare for DB status
                    const status = sessionStorage.getItem('glowbook_salon_status') || user.subscriptionStatus || 'trialing';

                    if (status === 'past_due' || status === 'canceled') {
                        setIsLocked(true);
                    } else {
                        setIsLocked(false);
                    }
                } catch (e) {
                    console.error("Failed to check salon status");
                } finally {
                    setChecking(false);
                }
            };

            checkStatus();
        } else if (!isLoading) {
            setChecking(false);
        }
    }, [user, isSalonOwner, isLoading]);

    if (isLoading || checking) return null;

    if (isLocked) {
        return (
            <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
                        <Lock size={48} />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">Systemet är låst</h1>
                        <p className="text-foreground/60 leading-relaxed">
                            Din prenumeration har löpt ut eller en betalning har misslyckats.
                            Betala din faktura i Stripe-portalen för att låsa upp systemet omedelbart.
                        </p>
                    </div>

                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4 text-left">
                        <div className="p-3 bg-foreground/5 rounded-xl text-foreground/40">
                            <CreditCard size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold">Väntande betalning</p>
                            <p className="text-xs text-foreground/40">Glowbook {user?.tier?.toUpperCase()} — Prenumeration</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link
                            href="/provider/settings?tab=membership"
                            className="w-full py-4 bg-foreground text-background rounded-2xl font-bold hover:bg-champagne-600 hover:text-white transition-all shadow-xl"
                        >
                            Hantera medlemskap
                        </Link>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-xs font-bold text-foreground/40 hover:text-foreground transition-colors"
                        >
                            Jag har betalat, uppdatera sidan
                        </button>
                    </div>

                    <p className="text-[10px] text-foreground/30 uppercase tracking-widest font-black">
                        Glowbook Security Engine
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
