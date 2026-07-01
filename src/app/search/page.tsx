
'use client';

import Header from "@/components/layout/Header";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, SearchSlash, ArrowRight, Sparkles, Globe } from "lucide-react";
import { NORDIC_COUNTRIES, getMunicipalities } from "@/data/nordic-data";
import { getSuggestionsForLanguage } from "@/data/search-suggestions";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import clsx from "clsx";

// Keyword to Category Mapping (Keys are keywords, Values are translation keys)
const CATEGORY_KEYWORDS: Record<string, string> = {
    'naglar': 'nails',
    'nails': 'nails',
    'manikyr': 'nails',
    'pedikyr': 'nails',
    'gellack': 'nails',
    'fransar': 'lashes',
    'bryn': 'lashes',
    'lashes': 'lashes',
    'brows': 'lashes',
    'microblading': 'lashes',
    'massage': 'massage',
    'spa': 'massage',
    'avslappning': 'massage',
    'hår': 'hair',
    'klippning': 'hair',
    'frisör': 'hair',
    'färgning': 'hair',
    'ansikte': 'facial',
    'hud': 'facial',
    'facial': 'facial',
    'skincare': 'facial',
    'smink': 'Makeup',
    'makeup': 'Makeup',
    'vaxning': 'Facial',
    'tatuering': 'Tatuering',
    'tattoo': 'Tatuering',
    'presentkort': 'nav_giftcards',
    'gift card': 'nav_giftcards',
    'gåvobrev': 'nav_giftcards',
    'piercing': 'Piercing',
    'piercare': 'Piercing'
};

const POPULAR_KEYS = ['nails', 'lashes', 'massage', 'hair', 'facial', 'nav_giftcards'];

export default function SearchPage() {
    const { language, setLanguage, t } = useLanguage();
    const [query, setQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState(NORDIC_COUNTRIES[0]);
    const [selectedMunicipality, setSelectedMunicipality] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [locationSearchQuery, setLocationSearchQuery] = useState('');

    // Auto-switch language based on country
    useEffect(() => {
        if (selectedCountry.language !== language) {
            setLanguage(selectedCountry.language as any);
        }
    }, [selectedCountry, language, setLanguage]);

    // Find category based on keyword
    const matchedCategoryKey = useMemo(() => {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return null;

        if (CATEGORY_KEYWORDS[lowerQuery]) return CATEGORY_KEYWORDS[lowerQuery];

        for (const [key, catKey] of Object.entries(CATEGORY_KEYWORDS)) {
            if (lowerQuery.includes(key)) return catKey;
        }

        return null;
    }, [query]);

    const matchedCategory = matchedCategoryKey ? t(matchedCategoryKey) : null;
    const municipalities = getMunicipalities(selectedCountry.code);

    const allMunicipalities = NORDIC_COUNTRIES.flatMap(country =>
        country.municipalities.map(m => ({ country, municipality: m }))
    );

    const filteredLocations = locationSearchQuery
        ? allMunicipalities.filter(item =>
            item.municipality.toLowerCase().includes(locationSearchQuery.toLowerCase())
        ).slice(0, 50)
        : allMunicipalities.filter(item => item.country.code === selectedCountry.code).slice(0, 50);

    const currentSuggestions = getSuggestionsForLanguage(language);
    const filteredSuggestions = query.trim()
        ? currentSuggestions.filter(s => {
            const q = query.toLowerCase().trim();
            const words = s.keyword.toLowerCase().split(' ');
            return s.keyword.toLowerCase().startsWith(q) || words.some(word => word.startsWith(q));
        }).slice(0, 8)
        : [];

    return (
        <div className="min-h-screen bg-[#FDFBF9] dark:bg-black flex flex-col font-outfit transition-colors duration-700">
            <Header />

            <main className="flex-1 flex flex-col items-center pt-48 px-6 pb-20 relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-4xl text-center space-y-12 relative z-10"
                >
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm mb-2">
                            <Globe size={14} className="text-champagne-600" />
                            <span className="text-[10px] font-black text-black/30 dark:text-white/30 tracking-[0.4em] uppercase">Global Discovery</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-black dark:text-white tracking-[-0.05em] leading-none uppercase">
                            Hitta din <br />
                            <span className="text-champagne-600 drop-shadow-[0_0_20px_rgba(212,175,55,0.2)]">Glow up.</span>
                        </h1>
                        <p className="text-black/40 dark:text-white/40 font-medium tracking-tight text-xl max-w-lg mx-auto leading-relaxed">
                            {t('search_subtitle')}
                        </p>
                    </div>

                    {/* Premium Search Container */}
                    <div className="relative group max-w-3xl mx-auto">
                        <div className="absolute -inset-1 bg-gradient-to-r from-champagne-500 to-champagne-700 rounded-[40px] blur opacity-10 group-focus-within:opacity-30 transition duration-1000"></div>
                        <div className="relative bg-white dark:bg-[#121212] rounded-[28px] shadow-2xl border border-black/5 dark:border-white/5 p-2 flex flex-col md:flex-row items-center gap-2">
                            <div className="flex-[2] flex items-center px-6 min-w-0 w-full relative">
                                <Search className="text-champagne-600 shrink-0" size={28} strokeWidth={2.5} />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                    placeholder={t('search_placeholder')}
                                    className="w-full pl-6 pr-6 py-6 text-2xl rounded-2xl border-none focus:ring-0 outline-none bg-transparent placeholder:text-black/10 dark:placeholder:text-white/10 text-black dark:text-white font-black tracking-tight shrink min-w-0"
                                />

                                <AnimatePresence>
                                    {isSearchFocused && filteredSuggestions.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-[120%] left-0 right-0 bg-white dark:bg-[#1A1A1A] rounded-[28px] shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden"
                                        >
                                            <div className="p-2 space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar">
                                                {filteredSuggestions.map(suggestion => (
                                                    <button
                                                        key={suggestion.id}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setQuery(suggestion.keyword);
                                                            setIsSearchFocused(false);
                                                        }}
                                                        className="w-full text-left px-5 py-4 rounded-2xl transition-all hover:bg-foreground/5 flex items-center gap-3 group"
                                                    >
                                                        <span className="text-lg font-bold text-foreground">{suggestion.keyword}</span>
                                                        <span className="text-lg font-bold text-foreground/20">-</span>
                                                        <span className="text-xs font-black uppercase tracking-widest text-foreground/40 group-hover:text-champagne-600 transition-colors">
                                                            {suggestion.category}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto p-2">
                                <div className="hidden md:block h-10 w-[1px] bg-black/5 dark:bg-white/5 mx-2" />

                                <div className="relative group/loc w-full md:w-64">
                                    <button
                                        onClick={() => setIsOpen(!isOpen)}
                                        className="w-full pl-6 pr-10 py-5 bg-foreground/5 dark:bg-white/5 rounded-[24px] text-sm font-black outline-none border-2 border-transparent focus:border-champagne-500 hover:border-black/10 dark:hover:border-white/10 transition-all text-foreground cursor-pointer uppercase tracking-widest truncate flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <MapPin className="text-champagne-600 shrink-0" size={20} />
                                            <span>{selectedMunicipality || t('all_cities') || 'Hela Sverige'}</span>
                                        </div>
                                        <ArrowRight size={14} className={clsx("transition-transform opacity-20", isOpen ? "-rotate-90" : "rotate-90")} />
                                    </button>

                                    <AnimatePresence>
                                        {isOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-[#1A1A1A] rounded-[28px] shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden"
                                                >
                                                    <div className="p-3 border-b border-black/5 dark:border-white/5 bg-foreground/5 dark:bg-foreground/5">
                                                        <div className="relative">
                                                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                                                            <input
                                                                type="text"
                                                                placeholder={t('location_search_placeholder') || "Sök stad eller plats..."}
                                                                value={locationSearchQuery}
                                                                onChange={(e) => setLocationSearchQuery(e.target.value)}
                                                                className="w-full pl-10 pr-4 py-3 bg-background border border-border dark:border-white/10 rounded-xl text-sm outline-none focus:border-champagne-500 transition-all font-bold text-foreground placeholder:text-foreground/30"
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="p-2 space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setSelectedMunicipality('');
                                                                setIsOpen(false);
                                                                setLocationSearchQuery('');
                                                            }}
                                                            className={clsx(
                                                                "w-full text-left px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                !selectedMunicipality
                                                                    ? "bg-foreground text-background"
                                                                    : "text-foreground/40 hover:bg-foreground/5"
                                                            )}
                                                        >
                                                            {t('all_cities') || 'Hela Sverige'}
                                                        </button>
                                                        {filteredLocations.map((item) => (
                                                            <button
                                                                key={`${item.country.code}-${item.municipality}`}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setSelectedCountry(item.country);
                                                                    setSelectedMunicipality(item.municipality);
                                                                    if (item.country.language !== language) setLanguage(item.country.language as any);
                                                                    setIsOpen(false);
                                                                    setLocationSearchQuery('');
                                                                }}
                                                                className={clsx(
                                                                    "w-full flex items-center justify-between text-left px-5 py-3 rounded-2xl transition-all",
                                                                    selectedMunicipality === item.municipality
                                                                        ? "bg-foreground text-background"
                                                                        : "hover:bg-foreground/5 group"
                                                                )}
                                                            >
                                                                <span className={clsx(
                                                                    "text-sm font-bold",
                                                                    selectedMunicipality === item.municipality ? "text-background" : "text-foreground"
                                                                )}>{item.municipality}</span>
                                                                <span className={clsx(
                                                                    "text-[10px] font-black uppercase tracking-widest",
                                                                    selectedMunicipality === item.municipality ? "text-background/50" : "text-foreground/30 group-hover:text-champagne-600 transition-colors"
                                                                )}>{item.country.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="hidden md:block h-10 w-[1px] bg-black/5 dark:bg-white/5 mx-2" />

                                <Link
                                    href={`/explore?q=${query}&m=${selectedMunicipality}&c=${selectedCountry.code}`}
                                    className="w-full md:w-auto bg-black dark:bg-white text-white dark:text-black px-12 py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] hover:bg-champagne-600 hover:text-white transition-all flex items-center justify-center gap-4 group/btn overflow-hidden relative shadow-xl active:scale-95"
                                >
                                    <span className="relative z-10">{t('search_button')}</span>
                                    <ArrowRight size={20} className="relative z-10 group-hover/btn:translate-x-2 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-champagne-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                                </Link>
                            </div>
                        </div>

                        {/* Category Prediction */}
                        <AnimatePresence>
                            {matchedCategory && query.length > 2 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 right-0 mt-6 bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-3xl rounded-[32px] border border-black/5 dark:border-white/10 p-6 flex items-center justify-between shadow-2xl"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-black dark:bg-white rounded-2xl flex items-center justify-center text-champagne-500 font-black text-2xl shadow-lg">
                                            {matchedCategory[0]}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-black/20 dark:text-white/20 text-[10px] font-black uppercase tracking-[0.3em] mb-1">{t('found_category')}</p>
                                            <p className="font-black text-2xl text-black dark:text-white tracking-tighter uppercase">{matchedCategory}</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={matchedCategoryKey === 'nav_giftcards' ? '/giftcards' : `/explore?category=${encodeURIComponent(matchedCategory)}&m=${selectedMunicipality}`}
                                        className="text-[10px] font-black text-black dark:text-white border-2 border-black/5 dark:border-white/5 px-8 py-4 rounded-2xl hover:bg-champagne-600 hover:text-white hover:border-champagne-600 transition-all uppercase tracking-[0.2em]"
                                    >
                                        {matchedCategoryKey === 'nav_giftcards' ? t('nav_giftcards') : `${t('view_all_in')} ${matchedCategory}`}
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Premium Tags */}
                    <div className="pt-20">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-black/20 dark:text-white/20 mb-8">{t('popular_searches')}</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            {POPULAR_KEYS.map((key) => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        if (key === 'nav_giftcards') {
                                            window.location.href = '/giftcards';
                                        } else {
                                            setQuery(t(key));
                                        }
                                    }}
                                    className="px-8 py-4 rounded-2xl bg-white dark:bg-white/5 text-black dark:text-white text-xs font-black uppercase tracking-[0.2em] border border-black/[0.03] dark:border-white/[0.03] shadow-sm hover:border-champagne-500 hover:text-champagne-600 transition-all hover:-translate-y-1 active:scale-95"
                                >
                                    {t(key)}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Minimalist Background Aura */}
                <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
                    <div className="absolute top-[20%] right-[-10%] w-[50rem] h-[50rem] bg-champagne-100/30 dark:bg-champagne-900/5 rounded-full blur-[150px] animate-pulse" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-champagne-50/20 dark:bg-champagne-800/10 rounded-full blur-[120px]" />
                </div>
            </main>
        </div>
    );
}
