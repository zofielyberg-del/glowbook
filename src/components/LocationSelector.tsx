
'use client';

import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Globe, Search } from 'lucide-react';
import { NORDIC_COUNTRIES, getMunicipalities } from '@/data/nordic-data';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

const CAPITALS: Record<string, string> = {
    'SE': 'Stockholm',
    'NO': 'Oslo',
    'DK': 'København',
    'FI': 'Helsinki',
    'IS': 'Reykjavík'
};

export default function LocationSelector({ dark = false, className }: { dark?: boolean, className?: string }) {
    const { language, setLanguage, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState(NORDIC_COUNTRIES[0]); // Default to Sweden
    const [selectedMunicipality, setSelectedMunicipality] = useState('Stockholm');
    const [searchTerm, setSearchTerm] = useState('');

    const allMunicipalities = NORDIC_COUNTRIES.flatMap(country =>
        country.municipalities.map(m => ({ country, municipality: m }))
    );

    const filteredMunicipalities = searchTerm
        ? allMunicipalities.filter(item =>
            item.municipality.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 50)
        : allMunicipalities.filter(item => item.country.code === selectedCountry.code).slice(0, 50);

    return (
        <div className={clsx("relative font-outfit flex items-center", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-full border transition-all text-sm font-medium backdrop-blur-sm shadow-sm",
                    "bg-card/50 border-border text-foreground hover:border-champagne-400 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                )}
            >
                <MapPin size={16} className="text-champagne-500" />
                <span className="tracking-tight">{selectedMunicipality || t('all_cities')}, {selectedCountry.name}</span>
                <ChevronDown size={14} className={clsx("transition-transform opacity-30", isOpen && "rotate-180")} />
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-border dark:bg-white/10 mx-2" />

            {/* Language Switcher */}
            <div className="relative group/lang flex items-center h-full ml-2">
                <button className="flex items-center gap-1.5 p-2 rounded-full hover:bg-foreground/5 transition-all text-foreground/40 hover:text-foreground">
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                        {language === 'English' ? 'EN' : language.slice(0, 2)}
                    </span>
                    <ChevronDown size={10} className="group-hover/lang:rotate-180 transition-transform" />
                </button>

                <div className="absolute left-0 top-full w-32 opacity-0 pointer-events-none group-hover/lang:opacity-100 group-hover/lang:pointer-events-auto transition-all z-50 pt-2">
                    <div className="bg-background border border-border rounded-xl shadow-xl py-1 relative">
                        {[
                            { id: 'Svenska', label: 'Svenska' },
                            { id: 'Norska', label: 'Norsk' },
                            { id: 'Danska', label: 'Dansk' },
                            { id: 'Finska', label: 'Suomi' },
                            { id: 'Isländska', label: 'Íslenska' }
                        ].map((lang) => (
                            <button
                                key={lang.id}
                                onClick={() => setLanguage(lang.id as any)}
                                className={clsx(
                                    "w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-foreground/5 transition-colors",
                                    language === lang.id ? "text-champagne-600" : "text-foreground/40"
                                )}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full mt-3 left-0 w-[320px] bg-card dark:bg-[#1A1A1A] rounded-[28px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-border dark:border-white/10 z-50 overflow-hidden gpu"
                        >
                            <div className="p-5 border-b border-border bg-foreground/5 dark:bg-foreground/5">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/40 mb-4">{t('location_title')}</h3>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                                        <input
                                            type="text"
                                            placeholder={t('location_search_placeholder')}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm outline-none focus:border-champagne-500 transition-all font-bold text-foreground placeholder:text-foreground/20 shadow-sm"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Country Selector - Custom Scrollbar (Dragsko) */}
                                    <div className="relative pt-2">
                                        <div className="flex gap-4 overflow-x-auto pb-2 snap-x scroll-smooth px-1 custom-horizontal-scrollbar">
                                            {NORDIC_COUNTRIES.map((country) => {
                                                const isActive = selectedCountry.code === country.code;
                                                return (
                                                    <button
                                                        key={country.code}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedCountry(country);
                                                            setSelectedMunicipality(CAPITALS[country.code] || country.municipalities[0]);
                                                            if (country.language !== language) {
                                                                setLanguage(country.language as any);
                                                            }
                                                            setSearchTerm('');
                                                        }}
                                                        className={clsx(
                                                            "relative px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-colors shrink-0 snap-start",
                                                            isActive ? "text-foreground" : "text-foreground/20 hover:text-foreground/50"
                                                        )}
                                                    >
                                                        <span className="relative z-10">{country.name}</span>
                                                        {isActive && (
                                                            <motion.div
                                                                layoutId="countryIndicator"
                                                                className="absolute bottom-1 left-2 right-2 h-[2px] bg-champagne-500 rounded-full"
                                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {/* Underline Track (The "neutral" track) */}
                                        <div className="absolute bottom-2 left-0 right-0 h-[1px] bg-foreground/10 -z-10" />
                                    </div>
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto p-3 custom-scrollbar">
                                <div className="grid grid-cols-1 gap-1">
                                    {filteredMunicipalities.length > 0 ? (
                                        filteredMunicipalities.map((item) => (
                                            <button
                                                key={`${item.country.code}-${item.municipality}`}
                                                onClick={() => {
                                                    setSelectedCountry(item.country);
                                                    setSelectedMunicipality(item.municipality);
                                                    if (item.country.language !== language) setLanguage(item.country.language as any);
                                                    setIsOpen(false);
                                                    setSearchTerm(''); // Reset search when closed
                                                }}
                                                className={clsx(
                                                    "w-full flex items-center justify-between text-left px-4 py-3 rounded-xl text-sm transition-all font-bold",
                                                    selectedMunicipality === item.municipality && selectedCountry.code === item.country.code
                                                        ? "bg-foreground text-background shadow-md"
                                                        : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                                                )}
                                            >
                                                <span>{item.municipality}</span>
                                                <span className={clsx(
                                                    "text-[10px] font-black uppercase tracking-widest",
                                                    selectedMunicipality === item.municipality && selectedCountry.code === item.country.code
                                                        ? "text-background/50"
                                                        : "text-foreground/30"
                                                )}>{item.country.name}</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-foreground/40 text-sm font-medium">
                                            Inga städer hittades
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

