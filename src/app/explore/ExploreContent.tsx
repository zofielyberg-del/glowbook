'use client';

import Header from "@/components/layout/Header";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Star, MapPin, Clock, Search, SlidersHorizontal, Sparkles, Zap, TrendingUp, BadgeCheck, Coins, ChevronDown, Check, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { getSuggestionsForLanguage } from "@/data/search-suggestions";
import { NORDIC_COUNTRIES } from "@/data/nordic-data";
import clsx from "clsx";

export default function ExploreContent() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const municipality = searchParams.get('m') || '';
    const { t, currency, language } = useLanguage();

    const [salons, setSalons] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [citySearch, setCitySearch] = useState(municipality);
    const [searchTerm, setSearchTerm] = useState(query);
    const [priceFilter, setPriceFilter] = useState<number | null>(null);
    const [ratingFilter, setRatingFilter] = useState<number | null>(null);
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'recommended' | 'price' | 'rating'>('recommended');
    const [locationLoading, setLocationLoading] = useState(false);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [locationInput, setLocationInput] = useState(municipality);
    const [isCityFocused, setIsCityFocused] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        setLocationInput(citySearch);
    }, [citySearch]);

    // All municipalities for autocomplete
    const allMunicipalities = useMemo(() => {
        return NORDIC_COUNTRIES.flatMap(country =>
            country.municipalities.map(m => ({ municipality: m, country }))
        );
    }, []);

    // Search suggestions for autocomplete
    const searchSuggestions = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2 || !isSearchFocused) return [];
        const suggestions = getSuggestionsForLanguage(language);
        const q = searchTerm.toLowerCase();
        return suggestions
            .filter(s => s.keyword.toLowerCase().startsWith(q))
            .slice(0, 6);
    }, [searchTerm, language, isSearchFocused]);

    const handleNearMe = () => {
        if (citySearch === 'Nära mig' || (citySearch && citySearch.startsWith('Nära mig'))) {
            setCitySearch('');
            setLocationInput('');
            setUserCoords(null);
            return;
        }

        if (!navigator.geolocation) {
            alert('Din webbläsare stöder inte platsdelning.');
            return;
        }

        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setUserCoords({ lat, lng });
                
                try {
                    const response = await fetch(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`);
                    const data = await response.json();
                    
                    if (data.success && data.detected) {
                        const cleanLoc = data.detected.replace(/\s+kommun/gi, '').trim();
                        const allMunicipalities = NORDIC_COUNTRIES.flatMap(c => c.municipalities);
                        const matched = allMunicipalities.find(m => 
                            m.toLowerCase() === cleanLoc.toLowerCase() || 
                            cleanLoc.toLowerCase().includes(m.toLowerCase())
                        );
                        
                        if (matched) {
                            setCitySearch(matched);
                            setLocationInput(matched);
                        } else {
                            setCitySearch(cleanLoc);
                            setLocationInput(cleanLoc);
                        }
                    } else {
                        setCitySearch('Nära mig');
                        setLocationInput('Nära mig');
                    }
                } catch (e) {
                    console.error('Reverse geocoding failed:', e);
                    setCitySearch('Nära mig');
                    setLocationInput('Nära mig');
                } finally {
                    setLocationLoading(false);
                }
            },
            (err) => {
                setLocationLoading(false);
                if (err.code === err.PERMISSION_DENIED) {
                    alert('Platsåtkomst nekades. Tillåt platsdelning i webbläsarens inställningar för att använda "Nära mig".');
                } else {
                    alert('Kunde inte hämta din plats. Försök igen.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    const calculateMinPrice = (salon: any) => {
        if (!salon.services || salon.services.length === 0) return null;
        return Math.min(...salon.services.map((s: any) => {
            const price = Number(s.price);
            const isSaleActive = s.sale_price && (!s.sale_ends_at || new Date(s.sale_ends_at) > new Date());
            return isSaleActive ? Math.min(price, Number(s.sale_price)) : price;
        }));
    };

    useEffect(() => {
        // Debounce search by 300ms to avoid hammering the API on every keystroke
        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const response = await fetch(
                    `/api/salons/list?municipality=${encodeURIComponent(citySearch)}&category=${encodeURIComponent(category)}&q=${encodeURIComponent(searchTerm)}`,
                    { cache: 'no-store' }
                );
                const data = await response.json();

                // Always get the local salon
                const saved = localStorage.getItem('glowbook_salon');
                const localSalons = saved ? [JSON.parse(saved)] : [];

                if (data.success) {
                    const filteredLocal = localSalons.filter((ls: any) => !data.salons.some((ss: any) => ss.id === ls.id));
                    const combined = [...data.salons, ...filteredLocal];

                    setSalons(combined.map(s => {
                        const tier = (s.tier || s.membership_tier || 'bas').toLowerCase();
                        const rawPrice = calculateMinPrice(s);
                        return {
                            ...s,
                            tier,
                            priceFrom: rawPrice,
                            image: s.logo_url || s.profileImage || s.image,
                        };
                    }));
                } else {
                    // Fallback to local drafts only if they have at least one service
                    const activeLocal = localSalons.filter(s => (s.services || []).length > 0);
                    setSalons(activeLocal.map(s => ({ 
                        ...s, 
                        priceFrom: calculateMinPrice(s),
                        tier: (s.tier || 'bas').toLowerCase(),
                        image: s.logo_url || s.profileImage || s.image
                    })));
                }
            } catch (error) {
                console.error('Error loading salons:', error);
                const saved = localStorage.getItem('glowbook_salon');
                if (saved) {
                    const ls = JSON.parse(saved);
                    setSalons([{ ...ls, priceFrom: calculateMinPrice(ls) }]);
                }
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [citySearch, category, searchTerm, t]);

    const filteredSalons = useMemo(() => {
        const tierOrder: Record<string, number> = { 'luxe': 3, 'pro': 2, 'bas': 1 };

        const getCategoryTerms = (cat: string): string[] => {
            const terms = [cat, cat.toLowerCase()];
            const lower = cat.toLowerCase();
            if (lower === 'hårvård' || lower === 'hair' || lower === 'frisör' || lower === 'frisor' || lower.includes('hår')) {
                terms.push('hair', 'hår', 'frisör', 'frisor', 'klippning', 'färgning', 'klipp', 'slingor', 'balayage', 'barber', 'skägg', 'shave', 'barberare');
            } else if (lower === 'naglar' || lower === 'nails' || lower.includes('nagel')) {
                terms.push('nails', 'naglar', 'manikyr', 'pedikyr', 'gellack', 'akryl', 'gelé', 'gele', 'nagel', 'manicure', 'pedicure', 'shellac');
            } else if (lower === 'fransar & bryn' || lower === 'fransar och bryn' || lower === 'lashes' || lower.includes('frans') || lower.includes('bryn')) {
                terms.push('lashes', 'fransar', 'bryn', 'brows', 'lashlift', 'browlift', 'vipper', 'eyebrows');
            } else if (lower === 'massage' || lower === 'massage/spa' || lower.includes('spa')) {
                terms.push('massage', 'spa', 'avslappning', 'massasje', 'hieronta');
            } else if (lower === 'hudvård' || lower === 'facial' || lower === 'skincare' || lower.includes('hud')) {
                terms.push('ansikte', 'hud', 'hudvård', 'facial', 'skincare', 'peeling', 'dermapen', 'microneedling', 'ansiktsbehandling', 'skin');
            } else if (lower === 'makeup' || lower === 'smink') {
                terms.push('smink', 'makeup', 'sminkning', 'meikki', 'förðun', 'permanent makeup', 'pmu');
            } else if (lower === 'tatuering' || lower === 'tattoo') {
                terms.push('tatuering', 'tattoo', 'gaddning', 'tatovering', 'tatuointi');
            } else if (lower === 'piercing') {
                terms.push('piercing', 'pierca');
            }
            return Array.from(new Set(terms));
        };

        const filtered = salons.filter(s => {
            if (!s.name) return false;

            // Handle location filtering (ignoring "Hela Sverige")
            const locQ = (citySearch || '').toLowerCase().trim();
            const ignoreLoc = !locQ || locQ === 'hela sverige' || locQ === 'alla städer' || locQ === t('all_cities').toLowerCase();
            
            if (!ignoreLoc && locQ !== 'nära mig') {
                const salonLoc = (s.municipality || '').toLowerCase();
                const salonAddr = (s.address || '').toLowerCase();
                if (!salonLoc.includes(locQ) && !salonAddr.includes(locQ)) return false;
            }

            // Combine all searchable terms
            const allSearchTerms: string[] = [];
            if (s.category) {
                if (Array.isArray(s.category)) {
                    s.category.forEach((c: any) => {
                        if (typeof c === 'string') allSearchTerms.push(c.toLowerCase());
                    });
                } else if (typeof s.category === 'string') {
                    allSearchTerms.push(s.category.toLowerCase());
                }
            }
            if (s.categories) {
                if (Array.isArray(s.categories)) {
                    s.categories.forEach((c: any) => {
                        if (typeof c === 'string') allSearchTerms.push(c.toLowerCase());
                    });
                } else if (typeof s.categories === 'string') {
                    allSearchTerms.push(s.categories.toLowerCase());
                }
            }
            if (s.practitioners) {
                s.practitioners.forEach((p: any) => {
                    (p.categories || []).forEach((c: string) => {
                        const lc = c.toLowerCase();
                        if (!allSearchTerms.includes(lc)) allSearchTerms.push(lc);
                    });
                });
            }
            if (s.services) {
                s.services.forEach((src: any) => {
                    if (src.name) {
                        const ln = src.name.toLowerCase();
                        if (!allSearchTerms.includes(ln)) allSearchTerms.push(ln);
                    }
                });
            }

            // Keyword / Category / URL filter
            const activeQuery = (searchTerm || '').toLowerCase().trim();
            const matchesQuery = !activeQuery || activeQuery === 'nya' ||
                s.name.toLowerCase().includes(activeQuery) ||
                (s.description || '').toLowerCase().includes(activeQuery) ||
                allSearchTerms.some(term => term.includes(activeQuery));

            // Sidebar Category Filter
            const activeCat = (category || '').toLowerCase().trim();
            let matchesCategory = !activeCat || activeCat === 'alla' || activeCat === 'nya';
            if (!matchesCategory) {
                const categoryTerms = getCategoryTerms(activeCat);
                matchesCategory = allSearchTerms.some(term => 
                    categoryTerms.some(catTerm => term.includes(catTerm.toLowerCase()))
                );
            }

            // Price/Rating/Quick Filters from state
            const matchesPrice = !priceFilter || (s.priceFrom || 0) <= priceFilter;
            const matchesRating = !ratingFilter || (s.rating || 0) >= ratingFilter;
            
            // Availability Filter (showAvailableOnly)
            let matchesAvailability = true;
            if (showAvailableOnly) {
                // Mock: Lux/Pro salons often have availability
                matchesAvailability = s.tier === 'luxe' || s.tier === 'pro' || (s.services && s.services.length > 0);
            }

            // "Nya" (New) logic
            let matchesNew = true;
            if (activeCat === 'nya' || activeQuery === 'nya') {
                const jDate = s.joined || s.created_at;
                if (!jDate) matchesNew = false;
                else {
                    const days = (new Date().getTime() - new Date(jDate).getTime()) / (1000 * 3600 * 24);
                    matchesNew = days <= 30; // 30 days for filter
                }
            }

            return matchesQuery && matchesCategory && matchesPrice && matchesRating && matchesAvailability && matchesNew;
        });

        return [...filtered].sort((a, b) => {
            if (sortBy === 'price') {
                return (a.priceFrom || 0) - (b.priceFrom || 0);
            }
            if (sortBy === 'rating') {
                const ratingA = Number(a.rating) || 0;
                const ratingB = Number(b.rating) || 0;
                if (ratingA !== ratingB) return ratingB - ratingA;
                return (b.review_count || 0) - (a.review_count || 0);
            }
            
            // Default "recommended" sort: Tier (LUXE > PRO > BAS) -> Rating -> Reviews -> Name
            const tierA = tierOrder[(a.tier || a.membership_tier || '').toLowerCase()] || 0;
            const tierB = tierOrder[(b.tier || b.membership_tier || '').toLowerCase()] || 0;
            if (tierA !== tierB) return tierB - tierA;
            
            const ratingA = Number(a.rating) || 0;
            const ratingB = Number(b.rating) || 0;
            if (ratingA !== ratingB) return ratingB - ratingA;
            
            const revA = a.review_count || 0;
            const revB = b.review_count || 0;
            if (revA !== revB) return revB - revA;
            
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [salons, searchTerm, category, priceFilter, ratingFilter, showAvailableOnly, citySearch, sortBy, t]);

    const topInCity = useMemo(() => filteredSalons.filter(s => (s.rating || 0) >= 4.5).slice(0, 6), [filteredSalons]);
    const quickTimes = useMemo(() => filteredSalons.filter(s => s.tier === 'luxe' || s.tier === 'pro').slice(0, 4), [filteredSalons]);
    const newProviders = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return filteredSalons.filter(s => s.joined && new Date(s.joined) >= thirtyDaysAgo).slice(0, 4);
    }, [filteredSalons]);

    const hasActiveFilters = searchTerm || priceFilter || ratingFilter || showAvailableOnly || citySearch;

    const detectedCategory = useMemo(() => {
        if (category) return category;
        if (!searchTerm || searchTerm === 'Nya') return '';
        const suggestions = getSuggestionsForLanguage(language);
        const match = suggestions.find(s =>
            s.keyword.toLowerCase() === searchTerm.toLowerCase() ||
            s.keyword.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return match?.category || '';
    }, [searchTerm, category, language]);

    const pageTitle = detectedCategory
        ? `${t('discover')} ${detectedCategory}`
        : t('explore_title');

    const resultCountText = (() => {
        const count = filteredSalons.length;
        const categoryLabel = detectedCategory ? detectedCategory.toLowerCase() : t('salons_found').split(' ').slice(1).join(' ') || 'salonger';
        const locationSuffix = citySearch ? ` ${t('in')} ${citySearch}` : '';
        if (detectedCategory) {
            return `${count} ${categoryLabel} ${t('found').toLowerCase()}${locationSuffix}`;
        }
        return `${count} ${t('salons_found')}${locationSuffix}`;
    })();

    return (
        <div className="min-h-screen bg-background dark:bg-black transition-colors duration-500 font-body">
            <Header />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-16 sm:pb-24 space-y-8 sm:space-y-12">
                {/* Search Header */}
                <div className="space-y-8">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 border-b border-border pb-6 sm:pb-10">
                        <div className="space-y-3">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                                {pageTitle}
                            </h1>
                            <p className="text-foreground/40 text-sm font-medium">
                                {resultCountText}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-center">
                            <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-[#121212] p-2 rounded-[28px] shadow-xl border border-black/5 dark:border-white/10 w-full lg:w-auto transition-all duration-300 focus-within:border-champagne-500/85 focus-within:ring-2 focus-within:ring-champagne-500/20">
                                <div className="relative flex items-center px-4 py-2 flex-1 min-w-[280px]">
                                    <Search className="text-champagne-600 shrink-0" size={24} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setIsSearchFocused(false);
                                                (e.target as HTMLInputElement).blur();
                                            }
                                        }}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        placeholder={t('explore_search_placeholder_2')}
                                        className="w-full pl-4 pr-2 py-3 bg-transparent border-none outline-none text-sm font-bold text-foreground placeholder:text-foreground/20"
                                    />
                                    <AnimatePresence>
                                        {isSearchFocused && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 6 }}
                                                className="absolute top-full left-0 right-0 mt-2 backdrop-blur-md bg-white/95 dark:bg-[#121212]/95 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden"
                                            >
                                                <div className="p-1.5 space-y-0.5 max-h-[300px] overflow-y-auto font-body">
                                                    {(!searchTerm || searchTerm.length < 2) ? (
                                                        <>
                                                            <div className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-foreground/30">Populära kategorier</div>
                                                            {[
                                                                { name: 'Naglar', category: 'Naglar' },
                                                                { name: 'Frisör & Hårvård', category: 'Hårvård' },
                                                                { name: 'Lash, Brow & Skönhet', category: 'Fransar & Bryn' },
                                                                { name: 'Massage & Spa', category: 'Massage' },
                                                                { name: 'Hudvård', category: 'Hudvård' }
                                                            ].map((cat) => (
                                                                <button
                                                                    key={cat.name}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setSearchTerm(cat.name);
                                                                        setIsSearchFocused(false);
                                                                    }}
                                                                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-foreground/5 text-left transition-all"
                                                                >
                                                                    <span className="text-sm font-bold text-foreground">{cat.name}</span>
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/25">Kategori</span>
                                                                </button>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        searchSuggestions.map((s) => (
                                                            <button
                                                                key={s.id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setSearchTerm(s.keyword);
                                                                    setIsSearchFocused(false);
                                                                }}
                                                                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-foreground/5 transition-all group"
                                                            >
                                                                <span className="text-sm font-bold text-foreground">{s.keyword}</span>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/25 group-hover:text-champagne-600 transition-colors">{s.category}</span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="hidden md:block h-8 w-[1px] bg-black/5 dark:bg-white/5 mx-1" />

                                <div className="relative flex items-center px-4 py-2 w-full md:w-64">
                                    <MapPin className="text-champagne-600 shrink-0" size={20} />
                                    <input
                                        type="text"
                                        value={locationInput}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setLocationInput(val);
                                            setCitySearch(val);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setIsCityFocused(false);
                                                (e.target as HTMLInputElement).blur();
                                            }
                                        }}
                                        onFocus={() => setIsCityFocused(true)}
                                        onBlur={() => setTimeout(() => setIsCityFocused(false), 200)}
                                        placeholder={t('all_cities')}
                                        className="w-full pl-3 pr-8 py-3 bg-transparent border-none outline-none text-sm font-bold text-foreground placeholder:text-foreground/20 uppercase tracking-wider"
                                    />
                                    {locationInput && (
                                        <button
                                            onClick={() => {
                                                setLocationInput('');
                                                setCitySearch('');
                                                setUserCoords(null);
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-rose-500 transition-colors text-sm font-bold"
                                        >
                                            ✕
                                        </button>
                                    )}
                                    <AnimatePresence>
                                        {isCityFocused && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 6 }}
                                                className="absolute top-full left-0 right-0 mt-2 backdrop-blur-md bg-white/95 dark:bg-[#121212]/95 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden"
                                            >
                                                <div className="p-1.5 space-y-0.5 max-h-[300px] overflow-y-auto font-body">
                                                    {(!locationInput || locationInput.length < 2) ? (
                                                        <>
                                                            <button
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    handleNearMe();
                                                                    setIsCityFocused(false);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-foreground/5 text-left transition-all"
                                                            >
                                                                <MapPin size={14} className="text-champagne-600" />
                                                                <span className="text-sm font-bold text-foreground">Använd min position</span>
                                                            </button>
                                                            <button
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setCitySearch('');
                                                                    setLocationInput('');
                                                                    setIsCityFocused(false);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-foreground/5 text-left transition-all"
                                                            >
                                                                <Globe size={14} className="text-champagne-600" />
                                                                <span className="text-sm font-bold text-foreground">Hela Sverige</span>
                                                            </button>
                                                            <div className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-foreground/30 border-t border-foreground/5 mt-1.5 pt-1.5">Populära städer</div>
                                                            {['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro'].map((city) => (
                                                                <button
                                                                    key={city}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setCitySearch(city);
                                                                        setLocationInput(city);
                                                                        setIsCityFocused(false);
                                                                    }}
                                                                    className="w-full flex items-center justify-between px-4 py-2 rounded-xl hover:bg-foreground/5 text-left transition-all"
                                                                >
                                                                    <span className="text-sm font-bold text-foreground">{city}</span>
                                                                </button>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        (() => {
                                                            const q = locationInput.toLowerCase().trim();
                                                            const matches = allMunicipalities
                                                                .filter(item => item.municipality.toLowerCase().includes(q))
                                                                .slice(0, 8);
                                                            if (matches.length === 0) {
                                                                return (
                                                                    <div className="px-4 py-3 text-xs text-foreground/40 text-center">
                                                                        Inga städer hittades
                                                                    </div>
                                                                );
                                                            }
                                                            return matches.map((item) => (
                                                                <button
                                                                    key={`${item.country.code}-${item.municipality}`}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setCitySearch(item.municipality);
                                                                        setLocationInput(item.municipality);
                                                                        setIsCityFocused(false);
                                                                    }}
                                                                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-foreground/5 transition-all group"
                                                                >
                                                                    <span className="text-sm font-bold text-foreground">{item.municipality}</span>
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/25 group-hover:text-champagne-600 transition-colors">{item.country.name}</span>
                                                                </button>
                                                            ));
                                                        })()
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto scrollbar-hide">
                        <div className="flex items-center gap-2 sm:gap-3 sm:flex-wrap min-w-max sm:min-w-0">
                            {[
                                { label: t('explore_filter_available_today'), active: showAvailableOnly, onClick: () => setShowAvailableOnly(!showAvailableOnly), icon: Clock },
                                { label: t('explore_filter_top_rating'), active: ratingFilter === 4.8, onClick: () => setRatingFilter(ratingFilter === 4.8 ? null : 4.8), icon: Star },
                                { label: `${t('explore_filter_under_price')} ${currency}`, active: priceFilter === 500, onClick: () => setPriceFilter(priceFilter === 500 ? null : 500), icon: Coins },
                                {
                                    label: t('explore_filter_new'), active: searchTerm === 'Nya', onClick: () => {
                                        const next = searchTerm === 'Nya' ? '' : 'Nya';
                                        setSearchTerm(next);
                                    }, icon: Sparkles
                                },
                                { label: locationLoading ? `${t('explore_filter_near_me')}...` : t('explore_filter_near_me'), active: citySearch === 'Nära mig', onClick: handleNearMe, icon: MapPin }
                            ].map((filter) => (
                                <motion.button
                                    key={filter.label}
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={filter.onClick}
                                    className={clsx(
                                        "group flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all border shadow-sm whitespace-nowrap",
                                        filter.active
                                            ? "bg-foreground text-background border-foreground shadow-xl shadow-foreground/10"
                                            : "bg-white dark:bg-[#111] text-foreground border-black/5 dark:border-white/5 hover:border-foreground/20 dark:hover:border-white/20"
                                    )}
                                >
                                    <filter.icon size={14} className={clsx("transition-transform group-hover:scale-110", filter.active ? "text-background" : "text-champagne-600")} />
                                    {filter.label}
                                </motion.button>
                            ))}

                            <AnimatePresence>
                                {hasActiveFilters && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        onClick={() => {
                                            setSearchTerm('');
                                            setCitySearch('');
                                            setLocationInput('');
                                            setPriceFilter(null);
                                            setRatingFilter(null);
                                            setShowAvailableOnly(false);
                                        }}
                                        className="px-6 py-3 rounded-2xl bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                                    >
                                        {t('explore_clear_filters')}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Discover Sections */}
                {!hasActiveFilters && (
                    <AnimatePresence>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                            {topInCity.length > 0 && (
                                <motion.section layout className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl"><TrendingUp size={18} /></div>
                                        <div>
                                            <h2 className="text-lg font-bold text-foreground">{t('explore_top_city_title')}</h2>
                                            <p className="text-xs text-foreground/40">{t('explore_top_city_desc')}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                        {topInCity.map((salon, i) => (<SalonMiniCard key={salon.id || i} salon={salon} currency={currency} />))}
                                    </div>
                                </motion.section>
                            )}
                            {quickTimes.length > 0 && (
                                <motion.section layout className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl"><Zap size={18} /></div>
                                        <div>
                                            <h2 className="text-lg font-bold text-foreground">{t('explore_quick_times_title')}</h2>
                                            <p className="text-xs text-foreground/40">{t('explore_quick_times_desc')}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                        {quickTimes.map((salon, i) => (<SalonMiniCard key={salon.id || i} salon={salon} currency={currency} />))}
                                    </div>
                                </motion.section>
                            )}
                            {newProviders.length > 0 && (
                                <motion.section layout className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl"><Sparkles size={18} /></div>
                                        <div>
                                            <h2 className="text-lg font-bold text-foreground">{t('explore_new_providers_title')}</h2>
                                            <p className="text-xs text-foreground/40">{t('explore_new_providers_desc')}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                        {newProviders.map((salon, i) => (<SalonMiniCard key={salon.id || i} salon={salon} currency={currency} />))}
                                    </div>
                                </motion.section>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* Main Grid */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-foreground">
                            {hasActiveFilters ? t('explore_search_results') : t('explore_all_providers')}
                        </h2>
                        <div className="flex items-center gap-4">
                            <SlidersHorizontal size={14} className="text-foreground/30" />
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-foreground/80 hover:text-foreground cursor-pointer transition-colors appearance-none pr-4">
                                <option value="recommended">{t('explore_sort_recommended')}</option>
                                <option value="rating">{t('explore_sort_rating')}</option>
                                <option value="price">{t('explore_sort_price')}</option>
                            </select>
                            <ChevronDown size={12} className="text-foreground/40 -ml-3 pointer-events-none" />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="space-y-4 animate-pulse">
                                    <div className="aspect-square rounded-3xl bg-foreground/10" />
                                    <div className="px-1 space-y-2">
                                        <div className="h-5 rounded-lg bg-foreground/10 w-3/4" />
                                        <div className="h-3 rounded-lg bg-foreground/5 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                            {filteredSalons.map((salon, i) => (
                                <motion.div key={salon.id || i} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                                    <Link href={`/salon/${salon.slug || salon.id || (salon.name ? salon.name.toLowerCase().trim().replace(/\s+/g, '-') : 'unknown')}`} className="group block space-y-4">
                                        <div className="aspect-square rounded-3xl overflow-hidden shadow-md relative transition-transform duration-300 group-hover:-translate-y-1 border border-black/5 dark:border-white/5 bg-card">
                                            <img src={(salon.profileImage || salon.logo_url || salon.banner_url || salon.backgroundImage || salon.image || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=100').replace(/w=\d+/g, 'w=1200').replace(/q=\d+/g, 'q=100')} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={salon.name} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                            {salon.is_verified && (
                                                <div className="absolute top-5 right-5 bg-blue-500 text-white p-1.5 rounded-full shadow-md" title="Verifierad Salong"><BadgeCheck size={14} /></div>
                                            )}
                                            {salon.priceFrom && (
                                                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
                                                    {salon.acceptsGlowpoints && (
                                                        <div className="flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-bold text-white"><Coins size={11} />Glowpoints</div>
                                                    )}
                                                    <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-white">
                                                        Från {salon.priceFrom} {currency}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-1 space-y-2">
                                            {(() => {
                                                const joinedDate = salon.joined || salon.created_at;
                                                const isNew = !salon.rating && joinedDate && (
                                                    (new Date().getTime() - new Date(joinedDate).getTime()) / (1000 * 3600 * 24) <= 21
                                                );
                                                
                                                return (
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-xl font-bold text-foreground truncate flex items-center gap-1.5">
                                                            <span>{salon.name}</span>
                                                            {salon.is_verified && (
                                                                <span className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-[2px] shrink-0" title="Glowbook-verifierad">
                                                                    <Check size={8} strokeWidth={4} />
                                                                </span>
                                                            )}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-champagne-500/10 rounded-lg text-sm font-black text-champagne-600">
                                                            <Star size={12} className={salon.rating ? "fill-current" : ""} />
                                                            <span>{salon.rating || (isNew ? 'NY' : '-')}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground/40">
                                                <MapPin size={10} />
                                                <span>{salon.municipality || 'Sverige'}</span>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {!isLoading && filteredSalons.length === 0 && (
                        <div className="py-24 text-center space-y-6">
                            <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-black/20 dark:text-white/20"><Search size={32} /></div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-foreground">{t('no_salons_found')}</h3>
                                <p className="text-foreground/40 text-sm">{t('no_salons_desc')}</p>
                            </div>
                            <Link href="/explore" className="inline-block px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-sm hover:opacity-80 transition-all">{t('new_search_link')}</Link>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}

function SalonMiniCard({ salon, currency }: { salon: any; currency: string }) {
    const joinedDate = salon.joined || salon.created_at;
    const isNew = !salon.rating && joinedDate && (
        (new Date().getTime() - new Date(joinedDate).getTime()) / (1000 * 3600 * 24) <= 21
    );

    return (
        <Link href={`/salon/${salon.slug || salon.id || (salon.name ? salon.name.toLowerCase().trim().replace(/\s+/g, '-') : 'demo')}`} className="group block">
            <div className="bg-card rounded-2xl border border-border overflow-hidden hover:border-champagne-300 dark:hover:border-champagne-600 transition-all hover:shadow-lg">
                <div className="aspect-[3/2] overflow-hidden relative">
                    <img src={(salon.profileImage || salon.logo_url || salon.banner_url || salon.backgroundImage || salon.image || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=100').replace(/w=\d+/g, 'w=800').replace(/q=\d+/g, 'q=100')} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={salon.name} />
                    {salon.is_verified && (
                        <div className="absolute top-3 right-3 bg-blue-500 text-white p-1 rounded-full shadow-md" title="Verifierad Salong"><BadgeCheck size={10} /></div>
                    )}
                </div>
                <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-foreground truncate flex items-center gap-1">
                            <span>{salon.name}</span>
                            {salon.is_verified && (
                                <span className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-[1.5px] shrink-0" title="Glowbook-verifierad">
                                    <Check size={6} strokeWidth={4} />
                                </span>
                            )}
                        </h4>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-champagne-500/10 rounded-md text-[10px] font-black text-champagne-600">
                            <Star size={10} className={salon.rating ? "fill-current" : ""} />
                            <span>{salon.rating || (isNew ? 'NY' : '-')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-foreground/40 uppercase tracking-widest truncate">
                        <MapPin size={8} className="text-champagne-600" />
                        {salon.municipality || 'Sverige'}
                    </div>
                </div>
            </div>
        </Link>
    );
}
