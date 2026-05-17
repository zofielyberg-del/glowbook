
// Force rebuild - wipe.ts removal confirmed
'use client';

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Star, Scissors, Syringe, Pen, Waves, Sparkles, Footprints, Activity, HandMetal, SmilePlus, CircleDot, ScissorsIcon, MapPin } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import React, { useState, useEffect } from "react";
import { NORDIC_COUNTRIES, getMunicipalities } from "@/data/nordic-data";
import { getSuggestionsForLanguage } from "@/data/search-suggestions";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

// Featured categories with real photos
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
      if (searchQuery.trim().length >= 1) { // Trigger suggestions from 1 char to be responsive
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
      const allResults = [...localMatches, ...formattedDb, ...staticMatches];
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

      <main className="pt-24 pb-24 gpu">
        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 py-12 sm:py-20 md:py-28 lg:py-40 flex flex-col items-center text-center overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto space-y-8"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-black/10 dark:border-white/10 bg-card dark:bg-white/5 shadow-sm">
              <Star size={12} className="text-champagne-500 fill-champagne-500" />
              <span className="text-[10px] font-bold text-foreground/50 dark:text-white/50 tracking-[0.2em] uppercase">{t('premium_experience')}</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight tracking-tight">
              Booking made <span className="text-champagne-500">easier</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-foreground/40 dark:text-white/40 max-w-xl mx-auto leading-relaxed font-medium">
              {(() => {
                const subtitle = t('home_hero_subtitle');
                const [line1, line2] = subtitle.split('\n');

                // Helper to split a line and highlight the second half (after "för", "för", "bare", "bara", "vain", "aðeins", "just")
                const renderHighlightedLine = (line: string) => {
                  if (!line) return null;

                  // Look for common separation words in the Nordic languages used in the translated string
                  const match = line.match(/^(.*?) (för|for|til|bare|bara|vain|aðeins|just) (.*)$/i);

                  if (match) {
                    return (
                      <>
                        {match[1]} <span className="text-foreground dark:text-white">{match[2]} {match[3]}</span>
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

            {/* Buttons & Search */}
            <div className="flex flex-col gap-6 sm:gap-8 items-center w-full max-w-4xl pt-6 sm:pt-10">
              {/* Premium Search Bar */}
              <div className="w-full relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-champagne-500 to-champagne-700 rounded-[32px] blur opacity-10 group-focus-within:opacity-20 transition duration-1000"></div>
                <div className="relative bg-white dark:bg-[#121212] rounded-[28px] shadow-2xl border border-black/5 dark:border-white/5 p-2 flex flex-col md:flex-row items-center gap-2">
                  {/* Text Input */}
                  <div className="flex-[2] flex items-center px-4 min-w-0 w-full relative">
                    <Search className="text-champagne-600 shrink-0" size={24} strokeWidth={2.5} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      placeholder={t('search_placeholder')}
                      className="w-full pl-4 pr-4 py-3 sm:py-4 text-base sm:text-lg md:text-xl rounded-2xl border-none focus:ring-0 outline-none bg-transparent placeholder:text-black/10 dark:placeholder:text-white/10 text-black dark:text-white font-bold tracking-tight"
                    />

                    {/* Autocomplete Dropdown */}
                    <AnimatePresence>
                      {isSearchFocused && filteredSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-[120%] left-0 right-0 bg-white dark:bg-[#1A1A1A] rounded-[24px] shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden"
                        >
                          <div className="p-2 space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar">
                            {filteredSuggestions.map((suggestion: any) => (
                              <button
                                key={suggestion.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (suggestion.type === 'salon') {
                                    // Use the actual ID or slug from the database/state instead of guessing
                                    const target = suggestion.id || suggestion.slug;
                                    window.location.href = `/salon/${target}`;
                                  } else {
                                    setSearchQuery(suggestion.keyword);
                                    setIsSearchFocused(false);
                                  }
                                }}
                                className="w-full text-left px-5 py-3 rounded-2xl transition-all hover:bg-foreground/5 flex items-center gap-2 group"
                              >
                                <span className="text-sm font-bold text-foreground">{suggestion.keyword}</span>
                                <span className="text-sm font-bold text-foreground/20">-</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 group-hover:text-champagne-600 transition-colors">
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
                  <div className="hidden md:block h-8 w-[1px] bg-black/5 dark:bg-white/5 mx-1" />

                  {/* Location Input with Autocomplete */}
                  <div className="relative w-full md:w-56 lg:w-64">
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-champagne-600 shrink-0" size={18} />
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
                        className="w-full pl-11 pr-4 py-4 bg-foreground/5 dark:bg-white/5 rounded-[20px] text-xs font-black outline-none border-2 border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.05)] focus:border-champagne-500 transition-all text-foreground placeholder:text-foreground/40 uppercase tracking-widest"
                      />
                      {selectedMunicipality && !locationSearchQuery && (
                        <button
                          onClick={() => { setSelectedMunicipality(''); setLocationSearchQuery(''); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground transition-colors text-xs font-bold"
                        >
                          ✕
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
                            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden"
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
                                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-foreground/5 transition-all group"
                                >
                                  <span className="text-sm font-bold text-foreground">{item.municipality}</span>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/25 group-hover:text-champagne-600 transition-colors">{item.country.name}</span>
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
                    className="w-full md:w-auto bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-[22px] font-black text-xs uppercase tracking-[0.2em] hover:bg-champagne-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 shrink-0"
                  >
                    <span>{t('home_hero_cta_book')}</span>
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>

              {/* Secondary Actions / Galaxy Glow Style */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full mt-4">
                <Link
                  href="/auth/register?role=provider"
                  className="relative group/glow"
                >
                  {/* Outer ambient glow */}
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-champagne-300 via-champagne-500 to-champagne-700 rounded-full blur-lg opacity-30 group-hover/glow:opacity-60 transition duration-1000" />
                  
                  {/* Button surface */}
                  <div className="relative flex items-center gap-3 px-10 py-4 bg-[#060713]/90 backdrop-blur-xl rounded-full border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden">
                    {/* Inner highlight */}
                    <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                    
                    <span className="text-white font-bold text-xs sm:text-sm tracking-[0.2em] uppercase">
                      {t('home_hero_cta_register')}
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Featured Categories (with photos) */}
        <section className="px-6 lg:px-20 py-12 max-w-screen-xl mx-auto">
          <div className="flex justify-between items-end mb-10">
            <div className="space-y-2">
              <h2 className="text-3xl font-heading font-black text-foreground">{t('popular_categories')}</h2>
            </div>
            <Link href="/explore" className="text-xs font-black uppercase tracking-widest text-foreground/40 hover:text-champagne-600 transition-colors">
              {t('view_all')}
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
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
                  className="group block aspect-square rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border border-black/5 dark:border-white/5 relative"
                >
                  <img
                    src={cat.img}
                    alt={t(cat.nameKey)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-6 pb-6 pt-20">
                    <h3 className="text-white font-heading font-bold text-base sm:text-xl md:text-2xl drop-shadow-lg group-hover:translate-y-[-4px] transition-transform duration-300">
                      {t(cat.nameKey)}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* All Other Categories */}
        <section className="px-6 lg:px-20 py-8 max-w-screen-xl mx-auto">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-2xl font-heading font-black text-foreground">{t('more_categories')}</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
            {MORE_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={cat.href}
                  className="group block aspect-square rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-700 border border-black/5 dark:border-white/5 relative"
                >
                  <img
                    src={cat.img}
                    alt={t(cat.nameKey)}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 mix-blend-overlay opacity-80"
                    onError={(e) => {
                      (e.target as any).src = `https://images.unsplash.com/photo-1620331311520-246422fe82f9?auto=format&fit=crop&q=80&w=400`;
                    }}
                  />
                  <div className="absolute inset-0 bg-[#0a0a0a]/60 group-hover:bg-[#0a0a0a]/40 transition-colors duration-700 flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-champagne-400 group-hover:scale-125 transition-all duration-700 mb-3 drop-shadow-[0_0_10px_rgba(197,160,89,0.3)]">
                      {cat.icon}
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest drop-shadow-lg">
                      {t(cat.nameKey)}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Location / Search CTA */}
        <section className="px-6 py-20">
          <div className="max-w-5xl mx-auto bg-card dark:bg-[#111] rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 md:p-20 text-center space-y-6 sm:space-y-8 relative overflow-hidden border border-black/5 dark:border-white/5 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-champagne-500/10 rounded-full blur-[100px] gpu" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-champagne-500/5 rounded-full blur-[80px] gpu" />

            <div className="relative z-10 space-y-6">
              <div className="w-16 h-16 bg-champagne-500/10 rounded-3xl flex items-center justify-center mx-auto text-champagne-600 shadow-inner">
                <MapPin size={32} />
              </div>
              <h2 className="text-3xl md:text-5xl font-heading font-black text-foreground">
                {t('find_treatment_title')}
              </h2>
              <p className="text-foreground/40 dark:text-white/40 max-w-xl mx-auto text-lg font-medium">
                {t('find_treatment_desc')}
              </p>
              <div className="pt-6">
                <Link href="/explore" className="inline-flex items-center gap-3 px-10 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-sm uppercase tracking-widest shadow-xl hover:bg-champagne-600 hover:text-white transition-all transform hover:-translate-y-1">
                  {t('search_your_city')} <ArrowRight size={18} />
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

