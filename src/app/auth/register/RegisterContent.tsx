'use client';

import Header from "@/components/layout/Header";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, ShieldCheck, Briefcase, AlertCircle, MapPin, Globe, Phone, ChevronDown, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { NORDIC_COUNTRIES, getMunicipalities } from "@/data/nordic-data";
import { useLanguage } from "@/context/LanguageContext";

export default function RegisterContent() {
    const { language, t, setLanguage, setCurrency } = useLanguage();
    const searchParams = useSearchParams();
    const initialRole = searchParams.get('role') === 'provider' ? 'provider' : 'customer';
    const [role, setRole] = useState<'customer' | 'provider'>(initialRole as any);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [selectedCountry, setSelectedCountry] = useState(NORDIC_COUNTRIES[0]);
    const [selectedMunicipality, setSelectedMunicipality] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    // Initial sync from language context (e.g. if browser detected Norska)
    useEffect(() => {
        const country = NORDIC_COUNTRIES.find(c => c.language === language);
        if (country) {
            setSelectedCountry(country);
        }
    }, [language]);

    // Sync context when country changes in registration
    useEffect(() => {
        setLanguage(selectedCountry.language as any);
        setCurrency(selectedCountry.currency);
    }, [selectedCountry, setLanguage, setCurrency]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Basic validation - email, phone, and names are mandatory for all
        if (!firstName || !lastName || !email || !phone || (role === 'provider' && !selectedMunicipality)) {
            setError(t('msg_fill_all_fields'));
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    firstName,
                    lastName,
                    phone,
                    role,
                    password,
                    country: selectedCountry.name,
                    municipality: selectedMunicipality
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Registreringen misslyckades.');
                return;
            }

            // Prepare local storage to maintain existing UI flow
            if (role === 'provider') {
                const providerData = {
                    ...data.salon, // Spread ALL salon data (id, name, tier, etc)
                    id: data.salon?.id || data.user.id,
                    firstName,
                    lastName,
                    email,
                    phone,
                    name: data.salon?.name || `${firstName} Beauty`,
                    slug: data.salon?.slug || `${firstName.toLowerCase()}-beauty`,
                    country: selectedCountry.name,
                    municipality: selectedMunicipality,
                    currency: selectedCountry.currency,
                    role: 'salon_owner'
                };
                sessionStorage.setItem('glowbook_salon', JSON.stringify(providerData));
                // Trigger auth update
                window.dispatchEvent(new Event('glowbook_update'));
                router.push('/onboarding/provider');
            } else {
                const customerData = {
                    id: data.user.id,
                    firstName,
                    lastName,
                    email,
                    phone,
                    points: 0,
                    role: 'customer'
                };
                sessionStorage.setItem('glowbook_customer', JSON.stringify(customerData));
                // Trigger auth update
                window.dispatchEvent(new Event('glowbook_update'));
                router.push('/profile');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setError('Ett tekniskt fel uppstod. Försök igen senare.');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
            <Header />

            <main className="flex-1 flex items-center justify-center p-6 pt-24 pb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden transition-colors"
                >
                    <div className="bg-premium-black p-6 text-center">
                        <h2 className="text-2xl font-heading font-bold text-white mb-2">{t('action_register')}</h2>
                        <p className="text-white/60 text-sm">Glowbook - Booking made easier</p>
                    </div>

                    <div className="p-8">
                        <div className="flex bg-foreground/5 p-1 rounded-lg mb-8 border border-border/50">
                            <button
                                type="button"
                                onClick={() => { setRole('customer'); setError(''); }}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                    role === 'customer' ? "bg-background text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground"
                                )}
                            >
                                <User size={16} /> {t('role_customer')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setRole('provider'); setError(''); }}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                    role === 'provider' ? "bg-background text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground"
                                )}
                            >
                                <Briefcase size={16} /> {t('role_provider')}
                            </button>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-foreground mb-1">{t('label_first_name')} <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Anna"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full px-4 py-4 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all leading-normal placeholder:text-foreground/30"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-foreground mb-1">{t('label_last_name')} <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Andersson"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full px-4 py-4 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all leading-normal placeholder:text-foreground/30"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">{t('label_email')}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="din@email.com"
                                    className="w-full px-4 py-4 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all leading-normal placeholder:text-foreground/30"
                                    autoComplete="email"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Telefonnummer *</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3.5 text-foreground/40" size={16} />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+46 70 123 4567"
                                        className="w-full pl-10 pr-4 py-4 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all leading-normal placeholder:text-foreground/30"
                                    />
                                </div>
                            </div>

                            {role === 'customer' ? (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{t('label_country')}</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-3.5 text-foreground/40" size={16} />
                                        <select
                                            value={selectedCountry.name}
                                            onChange={(e) => {
                                                const country = NORDIC_COUNTRIES.find(c => c.name === e.target.value);
                                                if (country) setSelectedCountry(country);
                                                setSelectedMunicipality('');
                                            }}
                                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all text-sm appearance-none"
                                        >
                                            {NORDIC_COUNTRIES.map(c => <option key={c.code} value={c.name} className="bg-card">{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">{t('label_country')}</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-3.5 text-foreground/40" size={16} />
                                            <select
                                                value={selectedCountry.name}
                                                onChange={(e) => {
                                                    const country = NORDIC_COUNTRIES.find(c => c.name === e.target.value);
                                                    if (country) setSelectedCountry(country);
                                                    setSelectedMunicipality('');
                                                }}
                                                className="w-full pl-10 pr-10 py-3 rounded-lg border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all text-sm appearance-none"
                                            >
                                                {NORDIC_COUNTRIES.map(c => <option key={c.code} value={c.name} className="bg-card">{c.name}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-3.5 text-foreground/40 pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">{t('label_municipality')}</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3.5 text-foreground/40" size={16} />
                                            <select
                                                value={selectedMunicipality}
                                                onChange={(e) => setSelectedMunicipality(e.target.value)}
                                                className="w-full pl-10 pr-10 py-3 rounded-lg border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all text-sm appearance-none"
                                            >
                                                <option value="" className="bg-card">{t('location_search_placeholder')}</option>
                                                {getMunicipalities(selectedCountry.code).map(m => (
                                                    <option key={m} value={m} className="bg-card">{m}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-3.5 text-foreground/40 pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">{t('label_password')}</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-4 rounded-xl border border-border bg-background text-foreground shadow-sm focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all pr-12 font-medium leading-normal placeholder:text-foreground/30"
                                        required
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

                            {error && (
                                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-[#111] dark:bg-white text-white dark:text-[#111] py-3 rounded-lg font-bold hover:bg-champagne-600 dark:hover:bg-champagne-300 transition-colors shadow-lg"
                            >
                                {t('action_register')}
                            </button>
                        </form>

                        <div className="mt-6 text-center space-y-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-foreground/40">Eller registrera med</span></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (role === 'provider') {
                                            const dummy = { firstName: 'Social', lastName: 'Provider', email: 'google@glowbook.se', phone: '+46700000000' };
                                            sessionStorage.setItem('glowbook_salon', JSON.stringify(dummy));
                                            router.push('/onboarding/provider');
                                        } else {
                                            const dummy = { firstName: 'Social', lastName: 'User', email: 'google@user.se', phone: '', points: 0 };
                                            sessionStorage.setItem('glowbook_customer', JSON.stringify(dummy));
                                            router.push('/profile');
                                        }
                                        window.dispatchEvent(new Event('glowbook_update'));
                                    }}
                                    className="flex items-center justify-center gap-2 border border-border py-3 rounded-xl hover:bg-foreground/[0.02] hover:border-foreground/20 transition-all font-medium text-sm text-foreground shadow-sm"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                    Google
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (role === 'provider') {
                                            const dummy = { firstName: 'Social', lastName: 'Provider', email: 'apple@glowbook.se', phone: '+46700000000' };
                                            sessionStorage.setItem('glowbook_salon', JSON.stringify(dummy));
                                            router.push('/onboarding/provider');
                                        } else {
                                            const dummy = { firstName: 'Social', lastName: 'User', email: 'apple@user.se', phone: '', points: 0 };
                                            sessionStorage.setItem('glowbook_customer', JSON.stringify(dummy));
                                            router.push('/profile');
                                        }
                                        window.dispatchEvent(new Event('glowbook_update'));
                                    }}
                                    className="flex items-center justify-center gap-2 border border-border py-3 rounded-xl hover:bg-foreground/[0.02] hover:border-foreground/20 transition-all font-medium text-sm text-foreground shadow-sm"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05 1.61-3.21 1.61-1.12 0-1.5-.68-2.84-.68-1.35 0-1.78.67-2.84.67-1.14 0-2.23-.66-3.21-1.61-2.01-1.96-3.54-5.54-3.54-8.7 0-3.11 1.6-4.77 3.12-4.77 1.48 0 2.22.84 3.14.84.9 0 1.48-.84 3.14-.84 1.25 0 2.45.54 3.12 1.34-2.69 1.61-2.26 5.5.4 6.64-.62 1.83-1.46 3.65-2.28 5.44zm-3.08-16.12c-.11-.01-.22-.01-.33-.01-1.47 0-2.8 1.15-2.8 2.53 0 .16.02.32.06.47 1.41-.07 2.65-1.2 2.65-2.53 0-.16-.02-.32-.06-.47z" /></svg>
                                    Apple
                                </button>
                            </div>

                            <p className="text-xs text-foreground/50 mt-4">
                                {t('action_login_prompt')} <Link href="/auth/login" className="text-champagne-700 font-medium hover:underline">{t('action_login')}</Link>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
