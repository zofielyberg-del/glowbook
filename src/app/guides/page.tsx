'use client';

import Header from "@/components/layout/Header";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { BookOpen, Sparkles, ChevronRight, ArrowRight, Clock, Eye, Paintbrush, Scissors, EyeIcon, Droplets } from "lucide-react";
import clsx from "clsx";

type Category = 'all' | 'nails' | 'lashes' | 'hair' | 'brows' | 'skincare';

interface Guide {
    id: string;
    category: Category;
    title: string;
    excerpt: string;
    readTime: string;
    tips: string[];
}

const CATEGORIES: { key: Category; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Alla', icon: <Sparkles size={14} /> },
    { key: 'nails', label: 'Naglar', icon: <Paintbrush size={14} /> },
    { key: 'lashes', label: 'Fransar', icon: <EyeIcon size={14} /> },
    { key: 'hair', label: 'Hår', icon: <Scissors size={14} /> },
    { key: 'brows', label: 'Bryn', icon: <Eye size={14} /> },
    { key: 'skincare', label: 'Hudvård', icon: <Droplets size={14} /> },
];

const GUIDES: Guide[] = [
    // Naglar
    {
        id: 'nails-1',
        category: 'nails',
        title: 'Hur du får naglar att hålla längre',
        excerpt: 'Maximera hållbarheten på dina gelénaglar med rätt rutiner och vanor.',
        readTime: '3 min',
        tips: [
            'Undvik att utsätta naglarna för hetta de första 48 timmarna',
            'Använd handskar vid disk och städning',
            'Applicera nagelolja dagligen för att hålla nagelbädden fuktig',
            'Undvik att använda naglarna som verktyg – det skapar mikroskador',
            'Boka fyll inom 2–3 veckor för bästa resultat',
        ],
    },
    {
        id: 'nails-2',
        category: 'nails',
        title: 'Så undviker du släpp',
        excerpt: 'De vanligaste orsakerna till att naglar lossnar – och hur du förebygger det.',
        readTime: '2 min',
        tips: [
            'Se till att dina naglar är fria från oljor och produkter före behandlingen',
            'Undvik att blöta händerna direkt innan besöket',
            'Håll naglarna borta från aceton och starka rengöringsmedel',
            'Peta aldrig på naglarna om du ser ett litet lyft – boka in lagning istället',
        ],
    },
    {
        id: 'nails-3',
        category: 'nails',
        title: 'Builder gel vs gel polish – skillnaden',
        excerpt: 'Välj rätt produkt baserat på dina behov och livsstil.',
        readTime: '3 min',
        tips: [
            'Gel polish är tunnare och mer naturlig – passar för kort och flexibel look',
            'Builder gel ger styrka och hållbarhet – perfekt för förlängningar',
            'Builder gel kan formas och byggas upp – ger mer kreativa möjligheter',
            'Gel polish är skonsammare vid borttagning',
            'Diskutera med din nagelteknolog vad som passar just dina naglar',
        ],
    },
    // Fransar
    {
        id: 'lashes-1',
        category: 'lashes',
        title: 'Hur du tvättar fransar rätt',
        excerpt: 'Ren fransraden är nyckeln till hållbara och friska fransar.',
        readTime: '2 min',
        tips: [
            'Använd en oljestyrd franstvätt eller speciellt skumrengöring',
            'Tvätta försiktigt med en mjuk fransborste i cirkelrörelser',
            'Skölj med ljummet vatten – undvik stark vattenstråle',
            'Torktappa försiktigt med en luddfri handduk',
            'Tvätta fransarna minst varannan dag för bästa resultat',
        ],
    },
    {
        id: 'lashes-2',
        category: 'lashes',
        title: 'Vad du ska undvika första 24h',
        excerpt: 'De första timmarna är avgörande för hållbarheten.',
        readTime: '2 min',
        tips: [
            'Undvik vatten och ånga i minst 24 timmar',
            'Sov inte på magen eller sidan – använd ryggläge',
            'Rör inte fransarna med fingrarna',
            'Undvik maskara och oljebaserade produkter',
            'Hoppa över bastun och intensiv träning första dygnet',
        ],
    },
    {
        id: 'lashes-3',
        category: 'lashes',
        title: 'Hur du får fransar att hålla längre',
        excerpt: 'Förläng tiden mellan påfyllningar med dessa enkla rutiner.',
        readTime: '3 min',
        tips: [
            'Borsta fransarna dagligen med en ren spooli-borste',
            'Undvik oljebaserad makeup och rengöring',
            'Sov med en silkeskuddöverdrag för att minska friktion',
            'Undvik att gnugga ögonen',
            'Boka påfyllning var 2–3 vecka för att hålla dem fulla',
        ],
    },
    // Hår
    {
        id: 'hair-1',
        category: 'hair',
        title: 'Hur ofta du bör tvätta håret',
        excerpt: 'Rätt tvättfrekvens gör stor skillnad för hårens hälsa.',
        readTime: '3 min',
        tips: [
            'Normalt hår: 2–3 gånger i veckan',
            'Torrt hår: 1–2 gånger i veckan',
            'Fett hår: Varannan dag, men undvik daglig tvätt',
            'Använd sulfatfritt schampo för att bevara färg och fukt',
            'Använd torschampo mellan tvättarna för fräschhet',
        ],
    },
    {
        id: 'hair-2',
        category: 'hair',
        title: 'Skydda håret mellan besök',
        excerpt: 'Enkla steg för att hålla håret friskt och välmående.',
        readTime: '2 min',
        tips: [
            'Använd alltid värmeskydd före styling',
            'Applicera hårolja på längderna för extra fukt',
            'Undvik hårt uppslaget hår som skapar spänning',
            'Sov med en sidenöverdragsdyna för att minska friktion',
            'Undvik att borsta vått hår – använd en breddtandad kam',
        ],
    },
    {
        id: 'hair-3',
        category: 'hair',
        title: 'Heat protection guide',
        excerpt: 'Allt du behöver veta om värmeskydd och rätt temperatur.',
        readTime: '2 min',
        tips: [
            'Använd alltid värmeskydd innan plattång, locktång eller fön',
            'Max 180°C för de flesta hårtyper',
            'Fint och skadat hår – max 150°C',
            'Torka håret till 80% lufttorrt innan föning',
            'Använd keramiska verktyg för jämnare värmefördelning',
        ],
    },
    // Bryn
    {
        id: 'brows-1',
        category: 'brows',
        title: 'Så sköter du bryn efter threading',
        excerpt: 'Rätt eftervård ger längre hållbarhet och flottare resultat.',
        readTime: '2 min',
        tips: [
            'Undvik att röra området direkt efter behandlingen',
            'Applicera aloe vera-gel för att lugna huden',
            'Undvik makeup på brynområdet i minst 12 timmar',
            'Skippa bastun och träning samma dag',
            'Använd brynserum för att stimulera tillväxt',
        ],
    },
    // Hudvård
    {
        id: 'skin-1',
        category: 'skincare',
        title: 'Grundrutin för strålande hud',
        excerpt: 'En enkel men effektiv hudvårdsrutin för alla hudtyper.',
        readTime: '4 min',
        tips: [
            'Rengör morgon och kväll med en mild rengöring',
            'Använd serum med hyaluronsyra för fukt',
            'Applicera dagkräm med SPF varje morgon – även mulet',
            'Använd nattkräm eller ansiktsolja på kvällen',
            'Exfoliera 1–2 gånger i veckan med en mild AHA/BHA',
        ],
    },
    {
        id: 'skin-2',
        category: 'skincare',
        title: 'Före och efter ansiktsbehandling',
        excerpt: 'Förbered huden optimalt och ta hand om den efteråt.',
        readTime: '3 min',
        tips: [
            'Undvik aktiva ingredienser (retinol, AHA) 48h före behandling',
            'Kom med ren hud utan makeup',
            'Direkt efter: undvik sol, svett och makeup i 24h',
            'Drick extra vatten för att hjälpa huden återhämta sig',
            'Boka din nästa behandling inom 4–6 veckor för bästa resultat',
        ],
    },
];

export default function GuidesPage() {
    const [activeCategory, setActiveCategory] = useState<Category>('all');
    const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

    const filteredGuides = activeCategory === 'all'
        ? GUIDES
        : GUIDES.filter(g => g.category === activeCategory);

    return (
        <div className="min-h-screen bg-[#FDFBF9] dark:bg-black text-black dark:text-white font-outfit transition-colors duration-500">
            <Header />

            <main className="pt-28 pb-24">
                {/* Hero */}
                <section className="px-6 mb-16">
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-champagne-500/10 border border-champagne-500/20 rounded-full text-champagne-600 text-[10px] font-bold uppercase tracking-[0.2em]">
                                <BookOpen size={12} /> Glowbook Expert Guide
                            </div>
                            <h1 className="text-4xl md:text-5xl font-heading font-bold text-black dark:text-white tracking-tight">
                                Rådgivning & <span className="text-champagne-500">skötsel</span>
                            </h1>
                            <p className="text-black/40 dark:text-white/40 text-lg max-w-xl mx-auto leading-relaxed">
                                Tips och guider för att ta hand om hår, naglar, fransar och hud mellan dina besök.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Category Filter */}
                <section className="px-6 mb-12">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.key}
                                    onClick={() => setActiveCategory(cat.key)}
                                    className={clsx(
                                        "px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border",
                                        activeCategory === cat.key
                                            ? "bg-black dark:bg-champagne-600 text-white border-transparent shadow-md"
                                            : "bg-white dark:bg-[#141414] text-black/40 dark:text-white/40 border-black/5 dark:border-white/10 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20"
                                    )}
                                >
                                    <span className="mr-1.5">{cat.icon}</span> {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Guides Grid */}
                <section className="px-6">
                    <div className="max-w-4xl mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeCategory}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-5"
                            >
                                {filteredGuides.map((guide, i) => {
                                    const isExpanded = expandedGuide === guide.id;

                                    return (
                                        <motion.div
                                            key={guide.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={clsx(
                                                "bg-white dark:bg-[#141414] rounded-2xl border shadow-sm overflow-hidden transition-all duration-300",
                                                isExpanded
                                                    ? "border-champagne-500/30 shadow-lg md:col-span-2"
                                                    : "border-black/5 dark:border-white/10 hover:shadow-md hover:border-champagne-500/20"
                                            )}
                                        >
                                            <button
                                                onClick={() => setExpandedGuide(isExpanded ? null : guide.id)}
                                                className="w-full p-6 text-left"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-8 h-8 rounded-lg bg-champagne-500/10 flex items-center justify-center text-champagne-600">
                                                                {CATEGORIES.find(c => c.key === guide.category)?.icon}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-champagne-600 uppercase tracking-widest">
                                                                {CATEGORIES.find(c => c.key === guide.category)?.label}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-lg font-heading font-bold text-black dark:text-white mb-2">{guide.title}</h3>
                                                        <p className="text-sm text-black/40 dark:text-white/40 leading-relaxed">{guide.excerpt}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-black/20 dark:text-white/20 shrink-0">
                                                        <Clock size={12} />
                                                        <span className="text-[10px] font-bold">{guide.readTime}</span>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Expanded Tips */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-6 pb-6 space-y-4">
                                                            <div className="border-t border-black/5 dark:border-white/10 pt-5">
                                                                <h4 className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-4">
                                                                    Snabba tips
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    {guide.tips.map((tip, j) => (
                                                                        <motion.div
                                                                            key={j}
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: j * 0.05 }}
                                                                            className="flex items-start gap-3"
                                                                        >
                                                                            <div className="w-6 h-6 rounded-full bg-champagne-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                                                                <span className="text-champagne-600 text-xs font-bold">{j + 1}</span>
                                                                            </div>
                                                                            <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">{tip}</p>
                                                                        </motion.div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* CTA */}
                                                            <div className="bg-[#F5F3EE] dark:bg-white/5 rounded-xl p-5 flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-sm font-bold text-black dark:text-white">Redo att boka?</p>
                                                                    <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">Se utförare nära dig</p>
                                                                </div>
                                                                <Link
                                                                    href="/explore"
                                                                    className="px-5 py-2.5 bg-black dark:bg-champagne-600 text-white rounded-full text-xs font-bold hover:bg-champagne-600 transition-all shadow-md flex items-center gap-1.5"
                                                                >
                                                                    Utforska <ArrowRight size={12} />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </section>

                {/* Bottom CTA */}
                <section className="px-6 mt-20">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-3xl p-12 text-center text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-champagne-500/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-champagne-500/5 rounded-full blur-3xl" />

                            <div className="relative z-10 space-y-5">
                                <Sparkles size={32} className="text-champagne-400 mx-auto" />
                                <h2 className="text-2xl md:text-3xl font-heading font-bold">Skapa konto för att boka</h2>
                                <p className="text-white/40 max-w-md mx-auto">
                                    Bli medlem i Glowbook och få tillgång till exklusiva utförare, rewards och personliga rekommendationer.
                                </p>
                                <div className="flex items-center justify-center gap-4">
                                    <Link
                                        href="/auth/register"
                                        className="px-8 py-3.5 bg-white text-black rounded-full text-sm font-bold hover:bg-champagne-400 transition-all shadow-lg"
                                    >
                                        Skapa konto
                                    </Link>
                                    <Link
                                        href="/explore"
                                        className="px-8 py-3.5 bg-white/10 text-white border border-white/20 rounded-full text-sm font-bold hover:bg-white/20 transition-all"
                                    >
                                        Utforska
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
