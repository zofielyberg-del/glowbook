'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lock, CreditCard } from 'lucide-react';

const VALID_STATUSES = ['active', 'trialing', 'canceling'];

export function DashboardGuard({ children }: { children: React.ReactNode }) {
    const { user, isSalonOwner, isLoading } = useAuth();
    const [isLocked, setIsLocked] = useState(false);
    const [checking, setChecking] = useState(true);
    const [loadingPortal, setLoadingPortal] = useState(false);

    const handleManageMembership = async () => {
        if (loadingPortal) return;
        setLoadingPortal(true);
        try {
            const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
            if (!saved) throw new Error('Salong hittades inte i lokalt minne.');
            const salon = JSON.parse(saved);

            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    salonId: salon.id,
                    email: user?.email,
                }),
            });
            const data = await response.json();
            if (!response.ok || !data.url) {
                throw new Error(data.error || 'Kunde inte initiera betalningsportal.');
            }
            window.location.href = data.url;
        } catch (err: any) {
            alert(err.message || 'Ett fel uppstod. Kontakta support.');
            setLoadingPortal(false);
        }
    };

    useEffect(() => {
        if (isLoading) return;

        let cancelled = false;

        const runGuard = async () => {
            if (!isSalonOwner || !user) {
                if (!cancelled) setChecking(false);
                return;
            }

            // 1. Always sync Stripe Checkout redirect here BEFORE locking,
            // because DashboardGuard unmounts children when locked.
            if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                const sessionId = params.get('session_id');
                const subscriptionParam = params.get('subscription');

                if (subscriptionParam === 'success' && sessionId) {
                    try {
                        const res = await fetch('/api/stripe/sync-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sessionId }),
                        });
                        const data = await res.json();
                        if (data.success && data.salon) {
                            const updateStorage = (storage: Storage) => {
                                const cached = storage.getItem('glowbook_salon');
                                if (!cached) return;
                                try {
                                    const parsed = JSON.parse(cached);
                                    storage.setItem(
                                        'glowbook_salon',
                                        JSON.stringify({
                                            ...parsed,
                                            subscription_status: data.salon.subscription_status,
                                            membership_tier: data.salon.membership_tier,
                                            tier: (data.salon.membership_tier || parsed.tier || 'pro').toLowerCase(),
                                            duration: data.salon.duration || parsed.duration,
                                            stripe_customer_id: data.salon.stripe_customer_id,
                                            stripe_subscription_id: data.salon.stripe_subscription_id,
                                        })
                                    );
                                } catch {}
                            };
                            updateStorage(sessionStorage);
                            updateStorage(localStorage);
                            window.dispatchEvent(new Event('glowbook_update'));
                            window.dispatchEvent(new Event('storage'));
                            window.history.replaceState({}, document.title, window.location.pathname);
                            if (!cancelled) {
                                setIsLocked(!VALID_STATUSES.includes((data.salon.subscription_status || '').toLowerCase()));
                                setChecking(false);
                            }
                            return;
                        }
                    } catch (syncErr) {
                        console.error('[DashboardGuard] Failed to sync Stripe session:', syncErr);
                    }
                }
            }

            // 2. Check current cached status
            const initialStatus = (
                sessionStorage.getItem('glowbook_salon_status') ||
                user.subscription_status ||
                user.subscriptionStatus ||
                'trialing'
            ).toLowerCase();

            if (!cancelled) {
                setIsLocked(!VALID_STATUSES.includes(initialStatus));
                setChecking(false);
            }

            // 3. Always refresh from server DB so Admin/Webhook changes unlock immediately
            try {
                const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
                if (saved) {
                    const localData = JSON.parse(saved);
                    if (localData.id && localData.id.length > 20) {
                        const response = await fetch(`/api/salons/get?id=${localData.id}&_t=${Date.now()}`);
                        const data = await response.json();
                        if (data.success && data.salon) {
                            const stillSaved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
                            if (!stillSaved) return;

                            let salon = data.salon;
                            if (Array.isArray(salon.category)) {
                                const [main, ...additional] = salon.category;
                                salon = {
                                    ...salon,
                                    category: main || '',
                                    categories: additional || [],
                                };
                            }

                            const updatedSalon = { ...localData, ...salon };
                            sessionStorage.setItem('glowbook_salon', JSON.stringify(updatedSalon));
                            localStorage.setItem('glowbook_salon', JSON.stringify(updatedSalon));

                            const freshStatus = (updatedSalon.subscription_status || '').toLowerCase();
                            if (!cancelled && freshStatus) {
                                setIsLocked(!VALID_STATUSES.includes(freshStatus));
                            }
                            window.dispatchEvent(new Event('glowbook_update'));
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to sync salon data from database', e);
            }
        };

        runGuard();

        return () => {
            cancelled = true;
        };
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
                            Din prenumeration har löpt ut eller behöver aktiveras via Stripe.
                            Slutför eller hantera din prenumeration i Stripe-portalen för att låsa upp systemet omedelbart.
                        </p>
                    </div>

                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4 text-left">
                        <div className="p-3 bg-foreground/5 rounded-xl text-foreground/40">
                            <CreditCard size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold">Väntande aktivering / betalning</p>
                            <p className="text-xs text-foreground/40">Glowbook {user?.tier?.toUpperCase()} — Prenumeration</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleManageMembership}
                            disabled={loadingPortal}
                            className="w-full py-4 bg-foreground text-background rounded-2xl font-bold hover:bg-champagne-600 hover:text-white transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loadingPortal ? 'Laddar...' : 'Hantera medlemskap'}
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-xs font-bold text-foreground/40 hover:text-foreground transition-colors"
                        >
                            Jag har aktiverat, uppdatera sidan
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
