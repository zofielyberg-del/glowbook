// Force rebuild - wipe.ts removal confirmed
'use client';

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  ArrowRight, Star, Scissors, Syringe, Pen, Waves, Sparkles, 
  Footprints, Activity, HandMetal, SmilePlus, CircleDot, 
  ScissorsIcon, MapPin, X, Check, Search, ShieldCheck 
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import React, { useState, useEffect } from "react";
import { NORDIC_COUNTRIES, getMunicipalities } from "@/data/nordic-data";
import { getSuggestionsForLanguage } from "@/data/search-suggestions";
import { useRouter } from "next/navigation";
import clsx from "clsx";

import FlowingBackground from "@/components/layout/FlowingBackground";

// Featured categories with real photos - portrait aspect for luxury editorial feel
const FEATURED_CATEGORIES = [
  {
    id: 'nails',
    nameKey: 'cat_nails_name',
    descKey: 'cat_nails_desc',
    img: '/assets/nails_new.jpg',
    href: '/explore?category=Naglar',
  },
  {
    id: 'lashes',
    nameKey: 'cat_lashes_name',
    descKey: 'cat_lashes_desc',
    img: '/assets/lashes_new.jpg',
    href: '/explore?category=Fransar+%26+Bryn',
  },
  {
    id: 'massage',
    nameKey: 'cat_massage_name',
    descKey: 'cat_massage_desc',
    img: '/assets/massage_new.jpg',
    href: '/explore?category=Massage',
  },
  {
    id: 'skincare',
    nameKey: 'cat_skin_name',
    descKey: 'cat_skin_desc',
    img: '/assets/skincare_new.jpg',
    href: '/explore?category=Hudv%C3%A5rd',
  },
];

// All other categories with user-provided Pinterest inspiration
const MORE_CATEGORIES: { id: string; nameKey: string; descKey: string; href: string; img: string; icon: React.ReactNode }[] = [
  {
    id: 'hair',
    nameKey: 'cat_hair_name',
    descKey: 'cat_hair_desc',
    href: '/explore?category=H%C3%A5rv%C3%A5rd',
    img: '/assets/hair_new.jpg',
    icon: <Scissors size={20} />,
  },
  {
    id: 'injection',
    nameKey: 'cat_injection_name',
    descKey: 'cat_injection_desc',
    href: '/explore?category=Estetisk+Injektion',
    img: '/assets/injection_new.jpg',
    icon: <Syringe size={20} />,
  },
  {
    id: 'tattoo',
    nameKey: 'cat_tattoo_name',
    descKey: 'cat_tattoo_desc',
    href: '/explore?category=Tatuering',
    img: '/assets/tattoo_new.jpg',
    icon: <Pen size={20} />,
  },
  {
    id: 'spa',
    nameKey: 'cat_spa_name',
    descKey: 'cat_spa_desc',
    href: '/explore?category=Spa',
    img: '/assets/spa_new.jpg',
    icon: <Waves size={20} />,
  },
  {
    id: 'makeup',
    nameKey: 'cat_makeup_name',
    descKey: 'cat_makeup_desc',
    href: '/explore?category=Makeup',
    img: '/assets/makeup_new.jpg',
    icon: <Sparkles size={20} />,
  },
  {
    id: 'footcare',
    nameKey: 'cat_footcare_name',
    descKey: 'cat_footcare_desc',
    href: '/explore?category=Fotv%C3%A5rd',
    img: '/assets/footcare_new.jpg',
    icon: <Footprints size={20} />,
  },
  {
    id: 'chiro',
    nameKey: 'cat_chiro_name',
    descKey: 'cat_chiro_desc',
    href: '/explore?category=Kiropraktik',
    img: '/assets/chiro_new.jpg',
    icon: <Activity size={20} />,
  },
  {
    id: 'naprapathy',
    nameKey: 'cat_naprapathy_name',
    descKey: 'cat_naprapathy_desc',
    href: '/explore?category=Naprapati',
    img: '/assets/napra_new.jpg',
    icon: <HandMetal size={20} />,
  },
  {
    id: 'teeth',
    nameKey: 'cat_teeth_name',
    descKey: 'cat_teeth_desc',
    href: '/explore?category=Tandblekning',
    img: '/assets/whitening_new.jpg',
    icon: <SmilePlus size={20} />,
  },
  {
    id: 'piercing',
    nameKey: 'cat_piercing_name',
    descKey: 'cat_teeth_desc',
    href: '/explore?category=Piercing',
    img: '/assets/piercing_new.jpg',
    icon: <CircleDot size={20} />,
  },
  {
    id: 'barber',
    nameKey: 'cat_barber_name',
    descKey: 'cat_barber_desc',
    href: '/explore?category=Barberare',
    img: '/assets/barber_new.jpg',
    icon: <ScissorsIcon size={20} />,
  },
];

export default function Home() {
  const { t, language, setLanguage } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const initialCountry = NORDIC_COUNTRIES.find(c => c.language === language) || NORDIC_COUNTRIES[0];
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const municipalities = getMunicipalities(selectedCountry.code);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [dbSalons, setDbSalons] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 1) {
        try {
          const res = await fetch(`/api/salons/list?q=${searchQuery}&municipality=${selectedMunicipality || ''}`);
          const data = await res.json();
          if (data.success) {
            setDbSalons(data.salons);
          }
        } catch (error) {
          console.error('Error fetching db salons:', error);
        }
      } else {
        setDbSalons([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedMunicipality]);

  // All municipalities for global search
  const allMunicipalities = NORDIC_COUNTRIES.flatMap(country =>
    country.municipalities.map(m => ({ country, municipality: m }))
  );

  const filteredLocations = locationSearchQuery
    ? allMunicipalities.filter(item =>
      item.municipality.toLowerCase().includes(locationSearchQuery.toLowerCase())
    ).slice(0, 50)
    : allMunicipalities.filter(item => item.country.code === (selectedCountry?.code || 'SE')).slice(0, 50);

  const currentSuggestions = getSuggestionsForLanguage(language);
  const filteredSuggestions = searchQuery.trim()
    ? (() => {
      const query = searchQuery.toLowerCase().trim();
      
      // Get static suggestions
      const staticMatches = currentSuggestions.filter(s => {
        const words = s.keyword.toLowerCase().split(' ');
        return s.keyword.toLowerCase().startsWith(query) || words.some(word => word.startsWith(query));
      });

      // Add local salon match
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('glowbook_salon') : null;
      const localMatches: any[] = [];
      if (saved) {
        const local = JSON.parse(saved);
        if (local.name?.toLowerCase().includes(query)) {
          localMatches.push({
            id: local.id || 'local-draft',
            keyword: local.name,
            category: local.category || 'Din salong',
            type: 'salon',
            tier: local.tier || 'bas'
          });
        }
      }

      // Format DB results
      const tierOrder: Record<string, number> = { 'LUXE': 3, 'PRO': 2, 'BAS': 1, 'luxe': 3, 'pro': 2, 'bas': 1 };
      const formattedDb = dbSalons.map(s => ({
        id: s.id,
        keyword: s.name,
        category: s.category || 'Salong',
        type: 'salon',
        tier: s.tier || s.membership_tier || 'bas'
      })).sort((a, b) => {
        const tA = tierOrder[a.tier] || 0;
        const tB = tierOrder[b.tier] || 0;
        return tB - tA;
      });

      // Merge results, removing duplicates by name
      const allResults = [...staticMatches];
      const uniqueResults: any[] = [];
      const seenNames = new Set();
      
      for (const res of allResults) {
        const nameKey = res.keyword.toLowerCase().trim();
        if (!seenNames.has(nameKey)) {
          seenNames.add(nameKey);
          uniqueResults.push(res);
        }
      }

      return uniqueResults.slice(0, 10);
    })()
    : [];

  return (
    <div className="min-h-screen bg-background dark:bg-black transition-colors duration-500 font-body">
      <Header />

      <main className="pt-24 pb-24 gpu relative">
        {/* Editorial Hero Section */}
        <section className="relative px-4 sm:px-6 py-16 sm:py-24 md:py-32 lg:py-40 flex flex-col items-center text-center overflow-hidden">
          <FlowingBackground />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-w-4xl mx-auto space-y-6 sm:space-y-8"
          >
            {/* Main Headline in Cormorant Garamond */}
            <div className="space-y-4">
              <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal text-foreground leading-[1.05] tracking-tight">
                Din tid. <br className="hidden sm:inline" />
                <span className="italic font-light text-champagne-500">Din skönhet.</span>
              </h1>
              
              {/* Minimal Luxury Divider */}
              <div className="w-12 h-px bg-champagne-500/50 mx-auto" />
            </div>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm md:text-base uppercase tracking-[0.22em] text-foreground/50 dark:text-white/50 max-w-xl mx-auto font-medium leading-relaxed">
              {(() => {
                const subtitle = t('home_hero_subtitle');
                const [line1, line2] = subtitle.split('\n');

                const renderHighlightedLine = (line: string) => {
                  if (!line) return null;
                  const match = line.match(/^(.*?) (för|for|til|bare|bara|vain|aðeins|just) (.*)$/i);
                  if (match) {
                    return (
                      <>
                        {match[1]} <span className="text-foreground dark:text-white font-semibold">{match[2]} {match[3]}</span>
                      </>
                    );
                  }
                  return line;
                };

                return (
                  <>
                    {renderHighlightedLine(line1)}<br />
                    {renderHighlightedLine(line2)}
                  </>
                );
              })()}
            </p>

            {/* Editorial Search Bar */}
            <div className="flex flex-col gap-6 sm:gap-8 items-center w-full max-w-3xl pt-6 sm:pt-10">
              <div className="w-full relative group">
                <div className="relative bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)] border border-black/10 dark:border-white/10 p-2 sm:p-2.5 flex flex-col md:flex-row items-center gap-2 transition-all duration-300 hover:border-champagne-500/40">
                  {/* Text Input */}
                  <div className="flex-[2] flex items-center px-4 min-w-0 w-full relative">
                    <Search className="text-champagne-600 shrink-0" size={20} strokeWidth={2} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      placeholder={t('search_placeholder')}
                      className="w-full pl-3.5 pr-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl border-none focus:ring-0 outline-none bg-transparent placeholder:text-black/30 dark:placeholder:text-white/30 text-black dark:text-white font-medium"
                    />

                    {/* Autocomplete Dropdown */}
                    <AnimatePresence>
                      {isSearchFocused && filteredSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.98 }}
                          className="absolute top-[120%] left-0 right-0 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 z-50 overflow-hidden"
                        >
                          <div className="p-2 space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar">
                            {filteredSuggestions.map((suggestion: any) => (
                              <button
                                key={suggestion.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (suggestion.type === 'salon') {
                                    const target = suggestion.id || suggestion.slug;
                                    window.location.href = `/salon/${target}`;
                                  } else {
                                    setSearchQuery(suggestion.keyword);
                                    setIsSearchFocused(false);
                                  }
                                }}
                                className="w-full text-left px-4 py-2.5 rounded-xl transition-all hover:bg-foreground/5 flex items-center gap-2 group"
                              >
                                <span className="text-sm font-medium text-foreground">{suggestion.keyword}</span>
                                <span className="text-sm text-foreground/20">-</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 group-hover:text-champagne-600 transition-colors">
                                  {suggestion.category}
                                </span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Divider */}
                  <div className="hidden md:block h-7 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

                  {/* Location Input with Autocomplete */}
                  <div className="relative w-full md:w-56">
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-champagne-600 shrink-0" size={16} />
                      <input
                        type="text"
                        value={locationSearchQuery}
                        onChange={(e) => {
                          setLocationSearchQuery(e.target.value);
                          if (!e.target.value) setSelectedMunicipality('');
                        }}
                        onFocus={() => setIsOpen(true)}
                        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                        placeholder={selectedMunicipality || t('all_cities') || 'Hela Sverige'}
                        className="w-full pl-10 pr-7 py-3 bg-foreground/5 dark:bg-white/5 rounded-xl text-xs font-semibold outline-none border border-transparent focus:border-champagne-500/50 transition-all text-foreground placeholder:text-foreground/40 uppercase tracking-wider"
                      />
                      {selectedMunicipality && !locationSearchQuery && (
                        <button
                          onClick={() => { setSelectedMunicipality(''); setLocationSearchQuery(''); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground transition-colors"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {isOpen && locationSearchQuery.trim().length >= 2 && (() => {
                        const q = locationSearchQuery.toLowerCase().trim();
                        const matches = allMunicipalities
                          .filter(item => item.municipality.toLowerCase().startsWith(q))
                          .slice(0, 8);

                        if (matches.length === 0) return null;

                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 z-50 overflow-hidden"
                          >
                            <div className="p-1.5 space-y-0.5">
                              {matches.map((item) => (
                                <button
                                  key={`${item.country.code}-${item.municipality}`}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setSelectedCountry(item.country);
                                    setSelectedMunicipality(item.municipality);
                                    setLocationSearchQuery('');
                                    setIsOpen(false);
                                    if (item.country.language !== language) setLanguage(item.country.language as any);
                                  }}
                                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl hover:bg-foreground/5 transition-all group"
                                >
                                  <span className="text-xs font-semibold text-foreground">{item.municipality}</span>
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 group-hover:text-champagne-600 transition-colors">{item.country.name}</span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>
                  </div>

                  {/* Search Button */}
                  <Link
                    href={`/explore?q=${encodeURIComponent(searchQuery)}&m=${encodeURIComponent(selectedMunicipality)}`}
                    className="w-full md:w-auto bg-black dark:bg-white text-white dark:text-black px-7 py-3.5 rounded-xl font-bold text-xs uppercase tracking-[0.18em] hover:bg-champagne-600 hover:text-white dark:hover:bg-champagne-600 dark:hover:text-white transition-all flex items-center justify-center gap-2.5 shadow-md active:scale-95 shrink-0"
                  >
                    <span>{t('home_hero_cta_book')}</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>

              {/* Sub-CTA targeted at salons */}
              <div className="flex items-center gap-2 pt-1 text-center">
                <Link
                  href="/auth/register?role=provider"
                  className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/50 hover:text-champagne-600 transition-colors inline-flex items-center gap-2 group"
                >
                  <span>Driver du salong?</span>
                  <span className="text-champagne-600 underline underline-offset-4 group-hover:text-champagne-700">Anslut kostnadsfritt med 0% provision &rarr;</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Featured Categories (Portrait Editorial Layout) */}
        <section className="px-6 lg:px-20 py-16 max-w-screen-xl mx-auto">
          <div className="flex justify-between items-end mb-10 pb-4 border-b border-black/5 dark:border-white/5">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-champagne-600">Upptäck</span>
              <h2 className="text-3xl sm:text-4xl font-heading font-normal text-foreground">{t('popular_categories')}</h2>
            </div>
            <Link href="/explore" className="text-xs font-bold uppercase tracking-widest text-foreground/40 hover:text-champagne-600 transition-colors inline-flex items-center gap-1">
              {t('view_all')} <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {FEATURED_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={cat.href}
                  className="group block aspect-[3/4] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-700 border border-black/5 dark:border-white/5 relative"
                >
                  <img
                    src={cat.img}
                    alt={t(cat.nameKey)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end p-6">
                    <div className="w-8 h-px bg-champagne-400/60 mb-2.5 transition-all duration-500 group-hover:w-14" />
                    <h3 className="text-white font-heading font-normal text-xl sm:text-2xl drop-shadow-md group-hover:text-champagne-300 transition-colors duration-300">
                      {t(cat.nameKey)}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* All Other Categories */}
        <section className="px-6 lg:px-20 py-12 max-w-screen-xl mx-auto">
          <div className="mb-10 text-center lg:text-left">
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-champagne-600">Brett utbud</span>
            <h2 className="text-2xl sm:text-3xl font-heading font-normal text-foreground mt-1">{t('more_categories')}</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            {MORE_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={cat.href}
                  className="group block aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-black/5 dark:border-white/10 relative"
                >
                  <img
                    src={cat.img}
                    alt={t(cat.nameKey)}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      (e.target as any).src = `https://images.unsplash.com/photo-1620331311520-246422fe82f9?auto=format&fit=crop&q=80&w=400`;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/15 group-hover:from-black/70 group-hover:via-black/20 group-hover:to-transparent transition-all duration-500 flex flex-col items-center justify-center p-3 text-center">
                    <div className="text-champagne-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-300 mb-2">
                      {cat.icon}
                    </div>
                    <h3 className="text-xs sm:text-sm font-heading font-medium text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                      {t(cat.nameKey)}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Prestige Section for Salons: 0% Provision */}
        <section className="px-6 lg:px-20 py-16 max-w-screen-xl mx-auto">
          <div className="relative bg-[#0A0A0A] text-white rounded-3xl p-8 sm:p-14 lg:p-20 overflow-hidden border border-white/10 shadow-2xl">
            {/* Ambient gold glow */}
            <div className="absolute -top-32 right-0 w-[500px] h-[500px] bg-champagne-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-32 left-0 w-[400px] h-[400px] bg-champagne-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-3xl">
              <span className="text-[10px] font-bold text-champagne-400 tracking-[0.25em] uppercase inline-block mb-3">
                För frisörer, terapeuter & kliniker
              </span>
              
              <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-normal text-white leading-tight mb-6">
                0% provision. <br />
                <span className="italic font-light text-champagne-400">100% din salong.</span>
              </h2>

              <p className="text-white/60 text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-2xl mb-10">
                Ett bokningssystem med prestige. Byggt för självständiga salonger och skönhetsterapeuter som vill ha en elegant bokningsupplevelse utan att betala dyra avgifter på sina egna stamkunder.
              </p>

              {/* 3 Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 pt-4 border-t border-white/10">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-champagne-400 font-semibold text-xs tracking-wider uppercase">
                    <Check size={14} /> 0 kr startavgift
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Inga bindningstider eller dolda kostnader. Kom igång på några minuter.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-champagne-400 font-semibold text-xs tracking-wider uppercase">
                    <Check size={14} /> Egen profilsida
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    En lyxig bokningssida som speglar kvaliteten i ditt hantverk.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-champagne-400 font-semibold text-xs tracking-wider uppercase">
                    <Check size={14} /> Full frihet
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Kalender, kundregister, SMS-påminnelser och direktbetalning på ett ställe.
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link
                  href="/auth/register?role=provider"
                  className="bg-champagne-500 hover:bg-champagne-400 text-black px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-lg hover:shadow-champagne-500/20 active:scale-95"
                >
                  <span>Skapa salongskonto kostnadsfritt</span>
                  <ArrowRight size={16} />
                </Link>
                <span className="text-xs text-white/40 font-light">
                  Inga kortuppgifter krävs för att starta
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Location / Treatment Search CTA */}
        <section className="px-6 py-16">
          <div className="max-w-4xl mx-auto bg-card dark:bg-[#111] rounded-3xl p-8 sm:p-14 text-center space-y-6 relative overflow-hidden border border-black/5 dark:border-white/5 shadow-xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-champagne-500/10 rounded-full blur-[90px] gpu pointer-events-none" />

            <div className="relative z-10 space-y-5">
              <div className="w-12 h-12 bg-champagne-500/10 rounded-2xl flex items-center justify-center mx-auto text-champagne-600">
                <MapPin size={24} />
              </div>
              <h2 className="text-2xl sm:text-4xl font-heading font-normal text-foreground">
                {t('find_treatment_title')}
              </h2>
              <p className="text-foreground/50 dark:text-white/50 max-w-lg mx-auto text-sm sm:text-base font-light">
                {t('find_treatment_desc')}
              </p>
              <div className="pt-4">
                <Link href="/explore" className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-champagne-600 hover:text-white dark:hover:bg-champagne-600 dark:hover:text-white transition-all transform hover:-translate-y-0.5">
                  {t('search_your_city')} <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
