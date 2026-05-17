
'use client';

import Header from "@/components/layout/Header";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Store, MapPin, User, ShieldCheck, Star, CreditCard, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { NORDIC_COUNTRIES, getMunicipalities } from "@/data/nordic-data";

// Mock Data for Categories
const CATEGORIES = ["Naglar", "Hudvård", "Hårvård", "Massage", "Fransar & Bryn", "Estetisk Injektion", "Tatuering", "Spa", "Makeup", "Fotvård", "Kiropraktik", "Naprapati", "Tandblekning", "Piercing", "Barberare"];

const DURATIONS = [
    { value: 1, label: '1 Månad', discount: 0 },
    { value: 3, label: '3 Månader', discount: 0.05, badge: '5% OFF' },
    { value: 6, label: '6 Månader', discount: 0.10, badge: '10% OFF' },
    { value: 12, label: '12 Månader', discount: 0.15, badge: '15% OFF' },
];

const TIER_PRICES = {
    bas: 79,
    pro: 149,
    luxe: 249 // Intro price, later 299
};

export default function ProviderOnboarding() {
    const router = useRouter();
    const { language, setLanguage, currency, setCurrency, t } = useLanguage();
    const [step, setStep] = useState(1);
    const [isKlarnaLoading, setIsKlarnaLoading] = useState(false);
    const [klarnaStatus, setKlarnaStatus] = useState<'loading' | 'processing' | 'success'>('loading');

    const [formData, setFormData] = useState({
        businessName: '',
        category: '',
        categories: [] as string[],
        country: 'Sverige',
        municipality: '',
        address: '',
        tier: 'pro' as 'bas' | 'pro' | 'luxe',
        duration: 3
    });

    const [hasPreFilledLocation, setHasPreFilledLocation] = useState(false);
    const [hasPreFilledName, setHasPreFilledName] = useState(false);


    // Initial load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('glowbook_salon');
        if (saved) {
            const data = JSON.parse(saved);
            setFormData(prev => ({
                ...prev,
                country: data.country || prev.country,
                municipality: data.municipality || prev.municipality,
            }));
            if (data.country && data.municipality) setHasPreFilledLocation(true);
        }
    }, []);

    // Sync Language and Currency when country changes
    useEffect(() => {
        const countryData = NORDIC_COUNTRIES.find(c => c.name === formData.country);
        if (countryData) {
            if (countryData.language !== language) {
                setLanguage(countryData.language as any);
            }
            setCurrency(countryData.currency);
        }
    }, [formData.country, language, setLanguage, setCurrency]);



    const calculatePrice = (tier: 'bas' | 'pro' | 'luxe', duration: number) => {
        const base = TIER_PRICES[tier];
        const durationObj = DURATIONS.find(d => d.value === duration);
        const discount = durationObj ? durationObj.discount : 0;
        const monthly = Math.round(base * (1 - discount));
        return {
            monthly,
            total: monthly * duration
        };
    };

    const handleNext = () => {
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleComplete = async () => {
        setIsKlarnaLoading(true);
        setKlarnaStatus('loading');

        const pricing = calculatePrice(formData.tier, formData.duration);

        // 1. Prepare Salon Data
        const saved = localStorage.getItem('glowbook_salon');
        let initialData = {} as any;
        if (saved) {
            try {
                initialData = JSON.parse(saved);
            } catch { }
        }

        const salonId = initialData.id || (formData.businessName ? formData.businessName.toLowerCase().replace(/\s+/g, '-') : `studio-${Date.now()}`);
        const salonEmail = initialData.email || (formData.businessName ? `${formData.businessName.toLowerCase().replace(/\s+/g, '')}@glowbook.se` : 'studio@glowbook.se');

        const newSalon: any = {
            ...initialData,
            id: salonId,
            name: formData.businessName || initialData.name,
            category: formData.category,
            categories: formData.categories,
            country: formData.country,
            municipality: formData.municipality,
            address: formData.address,
            email: salonEmail,
            tier: formData.tier,
            duration: formData.duration,
            paidAmount: pricing.total,
            currency: currency,
            joined: initialData.created_at || new Date().toISOString().split('T')[0],
            slug: (formData.businessName ? formData.businessName.toLowerCase().replace(/\s+/g, '-') : initialData.slug) || 'studio',
            subscription_status: 'trialing'
        };

        try {
            // 2. Sync with server first
            setKlarnaStatus('processing');
            const syncResponse = await fetch('/api/salons/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSalon)
            });

            const syncData = await syncResponse.json();
            const realId = syncData.salonId || salonId;

            // 3. Create Stripe Session
            const stripeResponse = await fetch('/api/stripe/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tier: formData.tier,
                    duration: formData.duration,
                    salonId: realId,
                    salonEmail: salonEmail
                })
            });

            const stripeData = await stripeResponse.json();

            if (stripeData.url) {
                setKlarnaStatus('success');
                // Save to local storage
                localStorage.setItem('glowbook_salon', JSON.stringify({ ...newSalon, id: realId }));
                
                // Small delay for the success UI
                setTimeout(() => {
                    window.location.href = stripeData.url;
                }, 800);
            } else {
                throw new Error(stripeData.error || 'Failed to create payment session');
            }
        } catch (err: any) {
            console.error('Onboarding Error:', err);
            setKlarnaStatus('loading');
            setIsKlarnaLoading(false);
            alert(`Ett fel uppstod: ${err.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-background transition-all duration-500 flex flex-col">
            <Header />

            <main className="flex-1 flex flex-col items-center justify-center p-6 pt-24 pb-12">

                {/* Progress Steps */}
                <div className="w-full max-w-2xl mb-12">
                    <div className="flex justify-between items-center relative">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10"></div>
                        {[1, 2, 3].map((s) => (
                            <div key={s} className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                                step >= s ? "bg-[#111] dark:bg-white text-white dark:text-[#111] shadow-lg ring-4 ring-black/5 dark:ring-white/10" : "bg-card text-foreground/40 border border-border"
                            )}>
                                {step > s ? <Check size={16} /> : s}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-foreground/30 mt-4 px-1">
                        <span className={clsx(step >= 1 && "text-foreground")}>{t('onboarding_step_1')}</span>
                        <span className={clsx(step >= 2 && "text-foreground")}>{t('onboarding_step_3')}</span>
                        <span className={clsx(step >= 3 && "text-foreground")}>{t('onboarding_step_4')}</span>
                    </div>
                </div>

                <motion.div
                    className="bg-card w-full max-w-2xl rounded-[32px] shadow-2xl border border-border overflow-hidden relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] p-8">
                        <h2 className="text-2xl font-heading font-bold text-white mb-1">
                            {step === 1 && t('onboarding_title_1')}
                            {step === 2 && t('onboarding_title_3')}
                            {step === 3 && t('onboarding_title_4')}
                        </h2>
                        <p className="text-white/60 text-sm">
                            {step === 1 && t('onboarding_desc_1')}
                            {step === 2 && t('onboarding_desc_3')}
                            {step === 3 && t('onboarding_desc_4')}
                        </p>
                    </div>

                    <div className="p-8 min-h-[400px]">
                        {/* Stripe/Glowbook Overlay */}
                        {isKlarnaLoading && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-[60] flex flex-col items-center justify-center text-center p-8 transition-colors">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border overflow-hidden transition-colors"
                                >
                                    <div className="bg-[#111] p-6 flex flex-col items-center">
                                        <div className="text-2xl font-heading font-bold tracking-tighter mb-1 select-none text-white">Glowbook Checkout</div>
                                        <div className="text-[10px] uppercase font-bold tracking-widest text-white/40">Secure Payment via Stripe</div>
                                    </div>

                                    <div className="p-8 space-y-6 text-left">
                                        <div className="space-y-1">
                                            <p className="text-xs text-foreground/40 uppercase font-bold tracking-widest">Valt medlemskap</p>
                                            <p className="text-xl font-bold text-foreground capitalize">
                                                Glowbook {formData.tier}
                                                <span className="text-sm font-normal text-foreground/50 ml-2">({formData.duration} mån)</span>
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs text-foreground/40 uppercase font-bold tracking-widest">Belopp att debiteras efter provperiod</p>
                                            <p className="text-3xl font-bold text-foreground">
                                                {calculatePrice(formData.tier, formData.duration).total} {currency}
                                            </p>
                                            {formData.duration > 1 && (
                                                <p className="text-xs font-bold text-emerald-600 mt-1">
                                                    Motsvarar endast {calculatePrice(formData.tier, formData.duration).monthly} {currency} / mån!
                                                </p>
                                            )}
                                            <p className="text-[10px] text-foreground/40 mt-1">Inga kostnader under din 30-dagars provperiod.</p>
                                        </div>

                                        <div className="py-8 flex flex-col items-center gap-4 min-h-[160px] justify-center">
                                            {klarnaStatus === 'loading' && (
                                                <>
                                                    <div className="w-12 h-12 border-4 border-foreground/10 border-t-champagne-500 rounded-full animate-spin"></div>
                                                    <p className="text-sm font-medium text-foreground/40">Förbereder säker anslutning...</p>
                                                </>
                                            )}
                                            {klarnaStatus === 'processing' && (
                                                <>
                                                    <div className="w-12 h-12 border-4 border-champagne-500 border-t-transparent rounded-full animate-spin"></div>
                                                    <p className="text-sm font-medium text-champagne-500 animate-pulse">Skapar din session...</p>
                                                </>
                                            )}
                                            {klarnaStatus === 'success' && (
                                                <motion.div
                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="flex flex-col items-center gap-4"
                                                >
                                                    <motion.div 
                                                        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                                        className="text-6xl drop-shadow-2xl"
                                                    >
                                                        ✨
                                                    </motion.div>
                                                    <div className="space-y-1 text-center">
                                                        <p className="text-sm font-bold text-champagne-600">Din salong förbereds! ✨</p>
                                                        <p className="text-[10px] text-foreground/40">Tar dig vidare till säker betalning...</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setIsKlarnaLoading(false)}
                                            className="w-full text-[10px] text-foreground/40 hover:text-foreground/60 underline"
                                        >
                                            Avbryt och ändra uppgifter
                                        </button>
                                    </div>

                                    <div className="bg-foreground/5 p-4 border-t border-border flex items-center justify-center gap-2">
                                        <ShieldCheck size={14} className="text-emerald-600" />
                                        <span className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">Krypterat via SSL & Stripe</span>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        <AnimatePresence mode="wait">

                            {/* STEP 1: BUSINESS INFO */}
                            {step === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-foreground mb-2">{t('label_business_name')}</label>
                                        <div className="relative">
                                            <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={18} />
                                            <input
                                                type="text"
                                                value={formData.businessName}
                                                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                                placeholder={t('placeholder_business_name')}
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-4 focus:ring-champagne-500/10 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-foreground mb-2">Huvudkategori</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none group-focus-within:text-champagne-500 transition-colors">
                                                <Sparkles size={18} />
                                            </div>
                                            <select
                                                required
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-4 focus:ring-champagne-500/10 outline-none transition-all appearance-none cursor-pointer font-bold"
                                            >
                                                <option value="" className="bg-card">{t('label_select_category')}</option>
                                                {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-card">{cat}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {formData.category && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-6 bg-foreground/[0.02] rounded-3xl border border-dashed border-border">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-3">Gör ni mer än bara {formData.category.toLowerCase()}?</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {CATEGORIES.filter(cat => cat !== formData.category).map(cat => {
                                                        const isSelected = formData.categories.includes(cat);
                                                        return (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = isSelected 
                                                                        ? formData.categories.filter(c => c !== cat)
                                                                        : [...formData.categories, cat];
                                                                    setFormData({ ...formData, categories: updated });
                                                                }}
                                                                className={clsx(
                                                                    "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                                                                    isSelected 
                                                                        ? "bg-[#111] text-white border-[#111] shadow-md" 
                                                                        : "bg-background text-foreground/40 border-border hover:border-champagne-300 hover:text-champagne-500"
                                                                )}
                                                            >
                                                                {cat}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-foreground/30 italic">Välj ytterligare kategorier för att synas i fler sökresultat.</p>
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {!hasPreFilledLocation ? (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-bold text-foreground mb-2">{t('label_country')}</label>
                                                    <select
                                                        value={formData.country}
                                                        onChange={(e) => setFormData({ ...formData, country: e.target.value, municipality: '' })}
                                                        className="w-full px-4 py-4 rounded-2xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-4 focus:ring-champagne-500/10 outline-none transition-all appearance-none"
                                                    >
                                                        {NORDIC_COUNTRIES.map(c => <option key={c.code} value={c.name} className="bg-card">{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-foreground mb-2">
                                                        {t('label_municipality')} <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={18} />
                                                        <select
                                                            value={formData.municipality}
                                                            onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                                                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-4 focus:ring-champagne-500/10 outline-none transition-all appearance-none"
                                                        >
                                                            <option value="" className="bg-card">{t('location_search_placeholder')}</option>
                                                            {getMunicipalities(NORDIC_COUNTRIES.find(c => c.name === formData.country)?.code || 'SE').map(m => (
                                                                <option key={m} value={m} className="bg-card">{m}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="md:col-span-2 bg-foreground/5 p-5 rounded-2xl flex items-center justify-between border border-border">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center text-champagne-500 shadow-sm border border-border">
                                                        <MapPin size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-foreground/40 tracking-[0.2em]">{t('label_country')}</p>
                                                        <p className="text-base font-bold text-foreground">{formData.municipality}, {formData.country}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setHasPreFilledLocation(false)}
                                                    className="text-sm text-foreground/60 hover:text-foreground font-bold underline px-4 py-2"
                                                >
                                                    {t('btn_change') || 'Ändra'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-foreground mb-2">{t('label_address')} <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={18} />
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="T.ex. Storgatan 12"
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-4 focus:ring-champagne-500/10 outline-none transition-all"
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-foreground/40 pl-1">
                                            Ange din fullständiga gatuadress. Denna adress visas på kartan för dina kunder.
                                        </p>
                                    </div>
                                </motion.div>
                            )}


                            {/* STEP 2: SUBSCRIPTION TIERS & BUNDLES */}
                            {step === 2 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                    {/* Free Trial Banner */}
                                    <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-5">
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm">Första månaden gratis!</h4>
                                            <p className="text-xs text-foreground/50">Testa valfri plan i 30 dagar utan kostnad. Avsluta när som helst.</p>
                                        </div>
                                    </div>

                                    <div className="p-1.5 bg-background border border-border rounded-[20px] flex gap-1">
                                        {DURATIONS.map((d) => {
                                            const prices = calculatePrice(formData.tier, d.value);
                                            return (
                                                <button
                                                    key={d.value}
                                                    onClick={() => setFormData({ ...formData, duration: d.value })}
                                                    className={clsx(
                                                        "flex-1 py-3 flex flex-col items-center justify-center rounded-[14px] transition-all relative",
                                                        formData.duration === d.value ? "bg-[#111] dark:bg-white text-white dark:text-[#111] shadow-lg" : "text-foreground/40 hover:text-foreground"
                                                    )}
                                                >
                                                    <span className="text-[10px] font-bold">{d.label}</span>
                                                    <span className="text-[9px] opacity-60 font-medium leading-none mt-0.5">{prices.total} {currency}</span>
                                                    {d.value > 1 && <span className="text-[8px] text-emerald-600 font-bold mt-1">Motsvarar {prices.monthly} kr/mån</span>}
                                                    {d.badge && (
                                                        <span className="absolute -top-3 -right-1 bg-champagne-500 text-white text-[8px] px-2 py-0.5 rounded-full ring-2 ring-card font-black shadow-lg">
                                                            {d.badge}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            { id: 'bas', label: 'Bas', desc: 'För dig som precis startat', features: ['Bokningskalender', 'Standardprofil', 'Begränsad synlighet i sök', 'Endast lokalt synlig'], limit: 'Max 20 bokningar/mån' },
                                            { id: 'pro', label: 'PRO', desc: 'Väx snabbare & syns mer', features: ['Syns högre i sök', 'Syns i "Upptäck"', 'Glow-tag (Kort länk)', 'SMS-påminnelser', 'Obegränsade bokningar'], popular: true },
                                            { id: 'luxe', label: 'LUXE', desc: 'För premium-studion', features: ['Högsta ranking (VIP)', 'Featured i din stad', 'Glow-tag (Kort länk)', 'Flera utförare (Team)', 'VIP Support'], note: '249kr nu (ord. 299kr)' }
                                        ].map((tier) => {
                                            const tValue = tier.id as 'bas' | 'pro' | 'luxe';
                                            const prices = calculatePrice(tValue, formData.duration);
                                            const isSelected = formData.tier === tValue;
                                            const isPremium = tValue === 'luxe';

                                            return (
                                                <label key={tValue} className={clsx(
                                                    "block relative border-2 rounded-3xl p-6 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]",
                                                    isSelected ? (isPremium ? "border-champagne-500 bg-gradient-to-br from-[#1a1a1a] to-[#111] text-white shadow-2xl" : "border-champagne-500 bg-champagne-500/5 shadow-sm") : "border-border bg-card"
                                                )}>
                                                    <input type="radio" name="tier" value={tValue} checked={isSelected} onChange={() => setFormData({ ...formData, tier: tValue })} className="sr-only" />

                                                    {tier.popular && (
                                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-champagne-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-tighter">
                                                            Populärast
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className={clsx("font-heading font-bold text-xl uppercase", isSelected && isPremium ? "text-white" : "text-foreground")}>
                                                                    {tier.label}
                                                                </h3>
                                                                {tier.id === 'pro' && <Star size={18} className="fill-champagne-500 text-champagne-500" />}
                                                            </div>
                                                            <p className={clsx("text-xs font-semibold mt-1 opacity-80", isSelected && isPremium ? "text-champagne-400" : "text-foreground/80")}>
                                                                {tier.desc}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={clsx("font-bold text-lg line-through opacity-40", isSelected && isPremium ? "text-white" : "text-foreground")}>{prices.monthly} {currency}</div>
                                                            <div className={clsx("font-black text-2xl", isSelected && isPremium ? "text-emerald-400" : "text-emerald-600")}>0 {currency}</div>
                                                            <p className="text-[10px] opacity-70">första månaden</p>
                                                        </div>
                                                    </div>

                                                    <AnimatePresence>
                                                        {isSelected && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className={clsx("mt-6 pt-6 border-t", isPremium ? "border-white/10" : "border-border")}>
                                                                    <div className="grid grid-cols-1 gap-3">
                                                                        {tier.features.map((feature, idx) => (
                                                                            <div key={idx} className="flex items-center gap-3">
                                                                                <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center shrink-0", isPremium ? "bg-champagne-500 text-premium-black" : "bg-champagne-50 text-champagne-600")}>
                                                                                    <Check size={12} strokeWidth={3} />
                                                                                </div>
                                                                                <span className={clsx("text-sm font-medium", isPremium ? "text-white/90" : "text-foreground/80")}>{feature}</span>
                                                                            </div>
                                                                        ))}
                                                                        {tier.limit && (
                                                                            <div className="mt-1 pl-8 text-[11px] font-bold text-red-400">
                                                                                {tier.limit}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: PAYMENT SUMMARY */}
                            {step === 3 && (
                                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-5">
                                            <CreditCard size={160} strokeWidth={1} />
                                        </div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">Provperiod aktiv</span>
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">{t('label_order_summary')}</h4>
                                        <h3 className="text-3xl font-bold mb-8 capitalize text-white">Glowbook {formData.tier} Membership</h3>

                                        <div className="space-y-6 border-t border-white/10 pt-8">
                                            <div className="flex justify-between items-center">
                                                <div className="space-y-1">
                                                    <p className="text-sm text-white/60">Att betala idag</p>
                                                    <p className="text-xs text-white/30">Provperiod — 30 dagar</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-4xl font-black text-emerald-400">0 {currency}</p>
                                                </div>
                                            </div>
                                            <div className="h-px bg-white/5" />
                                            <div className="flex justify-between items-center">
                                                <div className="space-y-1">
                                                    <p className="text-sm text-white/60">Därefter</p>
                                                    <p className="text-xs text-white/30">{formData.duration} mån bindningstid</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-champagne-400">{calculatePrice(formData.tier, formData.duration).total} {currency}</p>
                                                    {formData.duration > 1 && <p className="text-[10px] text-emerald-400 mt-1">Motsvarar {calculatePrice(formData.tier, formData.duration).monthly} kr/mån</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-5 border-2 border-champagne-500 bg-champagne-500/5 rounded-3xl p-6 relative">
                                            <div className="w-14 h-14 bg-[#111] rounded-2xl flex items-center justify-center text-white shadow-md">
                                                <ShieldCheck size={28} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <span className="font-bold text-foreground block text-xl">Säker betalning via Stripe</span>
                                                <span className="text-sm text-foreground/50">Kort, Apple Pay & Klarna stöds</span>
                                            </div>
                                            <div className="absolute -top-3 right-8 bg-champagne-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full ring-4 ring-card uppercase tracking-tighter shadow-lg">
                                                SÄKERT
                                            </div>
                                        </div>

                                        <div className="bg-foreground/[0.03] border border-border rounded-2xl p-4 space-y-2">
                                            <p className="text-xs text-foreground/50 leading-relaxed">
                                                ✓ Inga avgifter debiteras under de första 30 dagarna.
                                            </p>
                                            <p className="text-xs text-foreground/50 leading-relaxed">
                                                ✓ Betalmetoden verifieras säkert för automatisk debitering efter provperioden.
                                            </p>
                                            <p className="text-xs text-foreground/50 leading-relaxed">
                                                ✓ Du kan avsluta när som helst innan provperioden löper ut — helt utan kostnad.
                                            </p>
                                        </div>

                                        <p className="text-[10px] text-foreground/30 text-center px-8 leading-relaxed">
                                            Genom att fortsätta godkänner du våra användarvillkor. Efter 30 dagars gratis provperiod debiteras en förskottsbetalning på {calculatePrice(formData.tier, formData.duration).total} {currency} för din valda period via Stripe.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>

                    <div className="bg-[#F5F3EE] dark:bg-[#141414] p-8 flex justify-between items-center border-t border-border">
                        {step > 1 ? (
                            <button onClick={handleBack} className="text-foreground/40 font-bold hover:text-foreground px-6 py-2 transition-colors uppercase tracking-widest text-[10px]">
                                {t('btn_back')}
                            </button>
                        ) : <div />}

                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                disabled={
                                    (step === 1 && (!formData.businessName || !formData.category || !formData.municipality || !formData.address))
                                }
                                className="bg-[#111] dark:bg-white text-white dark:text-[#111] px-10 py-4 rounded-full font-black hover:bg-champagne-600 dark:hover:bg-champagne-300 transition-all disabled:opacity-20 disabled:grayscale flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95"
                            >
                                {t('btn_next')} <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleComplete}
                                className="bg-[#111] dark:bg-white text-white dark:text-[#111] px-12 py-5 rounded-full font-black text-xl hover:bg-champagne-600 dark:hover:bg-champagne-300 transition-all flex items-center gap-4 shadow-2xl hover:scale-105 active:scale-95"
                            >
                                Slutför & Aktivera via Stripe
                            </button>
                        )}
                    </div>
                </motion.div >
            </main >
        </div >
    );
}


