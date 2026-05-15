
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
                sessionStorage.setItem('glowbook_salon', JSON.stringify(data.salon));
                router.push('/provider');
            } else {
                sessionStorage.setItem('glowbook_customer', JSON.stringify(data.user));
                router.push('/profile');
            }

            window.dispatchEvent(new Event('glowbook_update'));

        } catch (error) {
            console.error('Login error:', error);
            setLoginError('Ett tekniskt fel uppstod. Försök igen.');
        }
    };

    const handleSocialLogin = (platform: string) => {
        setLoginError('');
        if (!email) {
            setLoginError('Fyll i din e-postadress först.');
            return;
        }

        if (role === 'provider') {
            // Provider MUST have existing account
            const existingSalon = sessionStorage.getItem('glowbook_salon');
            if (!existingSalon) {
                setLoginError('Inget utförarkonto hittades. Registrera dig först via "Starta som studio".');
                return;
            }
            // Log in — data preserved
            window.dispatchEvent(new Event('glowbook_update'));
            router.push('/provider');
        } else {
            // Customer: log in or create
            const existingCustomer = sessionStorage.getItem('glowbook_customer');
            if (existingCustomer) {
                window.dispatchEvent(new Event('glowbook_update'));
                router.push('/profile');
            } else {
                const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
                const nameParts = email.split('@')[0].split(/[._-]/);
                const newProfile = {
                    firstName: capitalize(nameParts[0] || ''),
                    lastName: capitalize(nameParts[1] || ''),
                    email: email,
                    phone: '',
                    points: 0,
                    role: 'customer'
                };

                // Sync to Server
                fetch('/api/profile/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newProfile)
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.profile) {
                            sessionStorage.setItem('glowbook_customer', JSON.stringify({ ...newProfile, id: data.profile.id }));
                            window.dispatchEvent(new Event('glowbook_update'));
                            router.push('/profile');
                        }
                    })
                    .catch(() => {
                        sessionStorage.setItem('glowbook_customer', JSON.stringify(newProfile));
                        window.dispatchEvent(new Event('glowbook_update'));
                        router.push('/profile');
                    });
            }
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
                                <Link href="/auth/forgot-password" hidden className="text-xs text-champagne-600 hover:underline">Glömt lösenord?</Link>
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
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-foreground/40">Eller fortsätt med</span></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleSocialLogin('google')}
                                    className="flex items-center justify-center gap-2 border border-border py-3 rounded-xl hover:bg-foreground/[0.02] hover:border-foreground/20 transition-all font-medium text-sm text-foreground shadow-sm"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                    Google
                                </button>
                                <button
                                    onClick={() => handleSocialLogin('apple')}
                                    className="flex items-center justify-center gap-2 border border-border py-3 rounded-xl hover:bg-foreground/[0.02] hover:border-foreground/20 transition-all font-medium text-sm text-foreground shadow-sm"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05 1.61-3.21 1.61-1.12 0-1.5-.68-2.84-.68-1.35 0-1.78.67-2.84.67-1.14 0-2.23-.66-3.21-1.61-2.01-1.96-3.54-5.54-3.54-8.7 0-3.11 1.6-4.77 3.12-4.77 1.48 0 2.22.84 3.14.84.9 0 1.48-.84 3.14-.84 1.25 0 2.45.54 3.12 1.34-2.69 1.61-2.26 5.5.4 6.64-.62 1.83-1.46 3.65-2.28 5.44zm-3.08-16.12c-.11-.01-.22-.01-.33-.01-1.47 0-2.8 1.15-2.8 2.53 0 .16.02.32.06.47 1.41-.07 2.65-1.2 2.65-2.53 0-.16-.02-.32-.06-.47z" /></svg>
                                    Apple
                                </button>
                            </div>

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
