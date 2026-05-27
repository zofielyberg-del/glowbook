
'use client';

import Header from "@/components/layout/Header";
import { useState } from "react";
import { motion } from "framer-motion";
import { User, Briefcase, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [role, setRole] = useState<'customer' | 'provider'>('customer');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');

        if (!email.trim() || !password.trim()) {
            setLoginError('Vänligen fyll i alla fält');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });

            const data = await response.json();

            if (!data.success) {
                setLoginError(data.error || 'Inloggningen misslyckades');
                return;
            }
            // Success! Store data in sessionStorage (maintaining existing UI logic)
            if (role === 'provider' && data.salon) {
                sessionStorage.removeItem('glowbook_customer'); // Clear opposite session
                sessionStorage.setItem('glowbook_salon', JSON.stringify(data.salon));
                router.push('/provider');
            } else {
                sessionStorage.removeItem('glowbook_salon'); // Clear opposite session
                sessionStorage.setItem('glowbook_customer', JSON.stringify(data.user));
                router.push('/profile');
            }

            window.dispatchEvent(new Event('glowbook_update'));

        } catch (error) {
            console.error('Login error:', error);
            setLoginError('Ett tekniskt fel uppstod. Försök igen.');
        }
    };

    const handleSocialLogin = async (platform: string) => {
        setLoginError('');
        
        let targetEmail = email;
        
        if (!targetEmail) {
            // Prompt user for their Google/Apple email address to simulate the popup flow
            const promptEmail = window.prompt(`Skriv in din e-postadress för att logga in med ${platform === 'google' ? 'Google' : 'Apple'}:`);
            if (!promptEmail) return;
            targetEmail = promptEmail.trim();
        }

        const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
        const nameParts = targetEmail.split('@')[0].split(/[._-]/);
        const firstName = capitalize(nameParts[0] || '');
        const lastName = capitalize(nameParts[1] || 'User');

        try {
            const response = await fetch('/api/auth/social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: targetEmail,
                    firstName,
                    lastName,
                    role,
                    platform
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setLoginError(data.error || 'Kunde inte logga in.');
                return;
            }

            if (role === 'provider') {
                sessionStorage.removeItem('glowbook_customer'); // Clear opposite session
                if (data.salon) {
                    sessionStorage.setItem('glowbook_salon', JSON.stringify(data.salon));
                    window.dispatchEvent(new Event('glowbook_update'));
                    router.push('/provider');
                } else {
                    // New salon owner: save profile info and send to onboarding
                    const newSalonDraft = {
                        email: data.user.email,
                        firstName: data.user.firstName,
                        lastName: data.user.lastName,
                        id: `salon-${Date.now()}`,
                        owner_id: data.user.id
                    };
                    sessionStorage.setItem('glowbook_salon', JSON.stringify(newSalonDraft));
                    window.dispatchEvent(new Event('glowbook_update'));
                    router.push('/onboarding/provider');
                }
            } else {
                sessionStorage.removeItem('glowbook_salon'); // Clear opposite session
                sessionStorage.setItem('glowbook_customer', JSON.stringify(data.user));
                window.dispatchEvent(new Event('glowbook_update'));
                router.push('/profile');
            }

        } catch (err) {
            console.error('Social auth error:', err);
            setLoginError('Nätverksfel vid inloggning.');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
            <Header />

            <main className="flex-1 flex items-center justify-center p-6 pt-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden"
                >
                    <div className="bg-premium-black p-6 text-center">
                        <h2 className="text-2xl font-heading font-bold text-white mb-2">Välkommen tillbaka</h2>
                        <p className="text-white/60 text-sm">Logga in på ditt Glowbook konto</p>
                    </div>

                    <div className="p-8">
                        {/* Role Switcher */}
                        <div className="flex bg-foreground/5 p-1 rounded-lg mb-8 border border-border/50">
                            <button
                                onClick={() => setRole('customer')}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                    role === 'customer' ? "bg-background text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground"
                                )}
                            >
                                <User size={16} /> Kund
                            </button>
                            <button
                                onClick={() => setRole('provider')}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                    role === 'provider' ? "bg-background text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground"
                                )}
                            >
                                <Briefcase size={16} /> Utförare
                            </button>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="din@email.com"
                                    className="w-full px-4 py-4 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all leading-normal placeholder:text-foreground/30"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Lösenord</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-4 rounded-xl border border-border bg-background text-foreground shadow-sm focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all pr-12 font-medium leading-normal placeholder:text-foreground/30"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-champagne-500 transition-colors p-2 z-10"
                                        aria-label={showPassword ? "Dölj lösenord" : "Visa lösenord"}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Link href="/auth/forgot-password" className="text-xs text-champagne-600 hover:underline">Glömt lösenord?</Link>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-[#111] dark:bg-white text-white dark:text-[#111] py-3 rounded-lg font-bold hover:bg-champagne-600 dark:hover:bg-champagne-300 transition-colors shadow-lg"
                            >
                                Logga in
                            </button>

                            {loginError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 font-medium text-center">
                                    {loginError}
                                    {role === 'provider' && !sessionStorage.getItem('glowbook_salon') && (
                                        <div className="mt-2 text-[10px] uppercase font-bold">
                                            <Link href="/auth/register" className="text-foreground hover:underline">
                                                → Starta som studio
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>

                        <div className="mt-6 text-center space-y-4">
                            <p className="text-xs text-foreground/50 mt-4">
                                Har du inget konto? <Link href="/auth/register" className="text-champagne-700 font-medium hover:underline">Registrera dig</Link>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
