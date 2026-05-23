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
