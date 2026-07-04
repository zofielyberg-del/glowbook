
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lock, CreditCard } from 'lucide-react';
import Link from 'next/link';

export function DashboardGuard({ children }: { children: React.ReactNode }) {
    const { user, isSalonOwner, isLoading } = useAuth();
    const [isLocked, setIsLocked] = useState(false);
    const [checking, setChecking] = useState(true);
    const [loadingPortal, setLoadingPortal] = useState(false);

    const handleManageMembership = async () => {
        if (loadingPortal) return;
        setLoadingPortal(true);
        try {
            // Get salon details from storage
            const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
            if (!saved) throw new Error("Salong hittades inte i lokalt minne.");
            const salon = JSON.parse(saved);

            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    salonId: salon.id,
                    email: user?.email
                })
            });
            const data = await response.json();
            if (!response.ok || !data.url) {
                throw new Error(data.error || "Kunde inte initiera betalningsportal.");
            }
            window.location.href = data.url;
        } catch (err: any) {
            alert(err.message || "Ett fel uppstod. Kontakta support.");
            setLoadingPortal(false);
        }
    };

    useEffect(() => {
        if (!isLoading && isSalonOwner && user) {
            // Check lock status
            const checkStatus = async () => {
                try {
                    const status = sessionStorage.getItem('glowbook_salon_status') || user.subscription_status || user.subscriptionStatus || 'trialing';
                    const validStatuses = ['active', 'trialing', 'canceling'];

                    if (!validStatuses.includes(status)) {
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

            // Sync global salon data to ensure Admin Portal changes take effect immediately
            const syncSalonData = async () => {
                try {
                    const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
                    if (saved) {
                        const localData = JSON.parse(saved);
                        if (localData.id && localData.id.length > 20) {
                            const response = await fetch(`/api/salons/get?id=${localData.id}&_t=${Date.now()}`);
                            const data = await response.json();
                            if (data.success && data.salon) {
                                // Check if user has logged out in the meantime
                                const stillSaved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
                                if (!stillSaved) {
                                    console.log('[DashboardGuard] User logged out during sync. Aborting.');
                                    return;
                                }
                                
                                // Merge category arrays properly if needed
                                let salon = data.salon;
                                if (Array.isArray(salon.category)) {
                                    const [main, ...additional] = salon.category;
                                    salon = {
                                        ...salon,
                                        category: main || '',
                                        categories: additional || []
                                    };
                                }
                                
                                // Preserve local non-persisted stuff if necessary, but prioritize server DB!
                                const updatedSalon = { ...localData, ...salon };
                                sessionStorage.setItem('glowbook_salon', JSON.stringify(updatedSalon));
                                localStorage.setItem('glowbook_salon', JSON.stringify(updatedSalon));
                                
                                // Dispatch event so the current page updates its state!
                                window.dispatchEvent(new Event('glowbook_update'));
                            }
                        }
                    }
                } catch (e) {
                    console.error("Failed to sync salon data from database", e);
                }
            };

            checkStatus();
            syncSalonData();
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
                        <button
                            onClick={handleManageMembership}
                            disabled={loadingPortal}
                            className="w-full py-4 bg-foreground text-background rounded-2xl font-bold hover:bg-champagne-600 hover:text-white transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loadingPortal ? "Laddar..." : "Hantera medlemskap"}
                        </button>
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
