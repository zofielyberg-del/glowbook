'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { 
  Search, 
  ArrowRight, 
  Sparkles, 
  Scissors, 
  Waves, 
  Activity, 
  SmilePlus, 
  Syringe, 
  Footprints, 
  HandMetal, 
  CircleDot, 
  Heart,
  Eye,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type CategoryItem = {
  id: string;
  name: string;
  group: 'hair' | 'nails_lashes' | 'skin_aesthetic' | 'massage_spa' | 'body_health';
  queryCategory: string;
  description: string;
  img: string;
  popularTreatments: string[];
  icon: any;
};

const CATEGORIES: CategoryItem[] = [
  {
    id: 'hair',
    name: 'Frisör & Hårvård',
    group: 'hair',
    queryCategory: 'Hårvård',
    description: 'Klippning, färgning, slingor, balayage, hårförlängning och styling för alla hårtyper.',
    img: '/assets/hair_new.jpg',
    popularTreatments: ['Klippning', 'Färg & Slingor', 'Balayage', 'Styling & Uppsättning', 'Olaplex-behandling'],
    icon: Scissors,
  },
  {
    id: 'barber',
    name: 'Barberare & Skägg',
    group: 'hair',
    queryCategory: 'Barberare',
    description: 'Klassisk herrklippning, skäggtrimning, fade och traditionell rakning med kniv och varma handdukar.',
    img: '/assets/barber_new.jpg',
    popularTreatments: ['Herrklippning', 'Skäggformning', 'Klassisk knivrakning', 'Skin Fade', 'Skäggvård'],
    icon: Scissors,
  },
  {
    id: 'nails',
    name: 'Naglar',
    group: 'nails_lashes',
    queryCategory: 'Naglar',
    description: 'Manikyr, pedikyr, nagelförlängning, gellack och unik nail art utförd av diplomerade nagelterapeuter.',
    img: '/assets/nails_new.jpg',
    popularTreatments: ['Gellack / Shellac', 'Nagelförlängning', 'Klassisk manikyr', 'Nail Art', 'Återbesök'],
    icon: Sparkles,
  },
  {
    id: 'lashes',
    name: 'Fransar & Bryn',
    group: 'nails_lashes',
    queryCategory: 'Fransar & Bryn',
    description: 'Framhäv din naturliga blick med professionellt lashlift, browlift, trådning och volymfransar.',
    img: '/assets/lashes_new.jpg',
    popularTreatments: ['Lashlift & Keratin', 'Browlift', 'Volymfransar', 'Formning & Färgning', 'Singelfransar'],
    icon: Eye,
  },
  {
    id: 'skincare',
    name: 'Hudvård & Ansikte',
    group: 'skin_aesthetic',
    queryCategory: 'Hudvård',
    description: 'Djupgående ansiktsbehandlingar, kemisk peeling, microneedling och hudföryngring med ledande resultat.',
    img: '/assets/skincare_new.jpg',
    popularTreatments: ['Klassisk ansiktsbehandling', 'Dermapen / Microneedling', 'Kemisk peeling', 'HydraFacial', 'Portömning'],
    icon: Sparkles,
  },
  {
    id: 'injection',
    name: 'Estetiska Injektioner',
    group: 'skin_aesthetic',
    queryCategory: 'Estetisk Injektion',
    description: 'Säkra och naturliga resultat utförda av legitimerade läkare och sjuksköterskor. Botox, fillers och skinboosters.',
    img: '/assets/injection_new.jpg',
    popularTreatments: ['Botox / Rynkbehandling', 'Läppförstoring', 'Profhilo & Skinboosters', 'Käklinje & Haka', 'Hyalase'],
    icon: Syringe,
  },
  {
    id: 'massage',
    name: 'Massage & Friskvård',
    group: 'massage_spa',
    queryCategory: 'Massage',
    description: 'Avslappnande klassisk massage, djupgående idrottsmassage, triggerpunktsbehandling och lymfmassage.',
    img: '/assets/massage_new.jpg',
    popularTreatments: ['Klassisk svensk massage', 'Djupgående idrottsmassage', 'Rygg- & nackmassage', 'Aromamassage', 'Gravidmassage'],
    icon: Heart,
  },
  {
    id: 'spa',
    name: 'Spa & Wellness',
    group: 'massage_spa',
    queryCategory: 'Spa',
    description: 'Lyxiga sparitualer, kurbad, bodyscrub och helkroppsbehandlingar för fullständig avkoppling.',
    img: '/assets/spa_new.jpg',
    popularTreatments: ['Helkroppsskrubb', 'Kurbad & Jacuzzi', 'Duo-spapaket', 'Ler- & tånginpackning', 'Relaxavdelning'],
    icon: Waves,
  },
  {
    id: 'makeup',
    name: 'Makeup & Styling',
    group: 'nails_lashes',
    queryCategory: 'Makeup',
    description: 'Professionell makeup för bröllop, fest och fotografering samt personlig makeuprådgivning.',
    img: '/assets/makeup_new.jpg',
    popularTreatments: ['Festmakeup', 'Brudmakeup & Provsminkning', 'Dagmakeup', 'Sminkkurs / Konsultation'],
    icon: Sparkles,
  },
  {
    id: 'footcare',
    name: 'Fotvård & Pedikyr',
    group: 'body_health',
    queryCategory: 'Fotvård',
    description: 'Medicinsk fotvård och välgörande spapedikyr för mjuka, välmående fötter och nagelvård.',
    img: '/assets/footcare_new.jpg',
    popularTreatments: ['Medicinsk fotvård', 'Spapedikyr', 'Fotmassage', 'Förhårdnader & Nageltrång', 'Lackning'],
    icon: Footprints,
  },
  {
    id: 'chiro',
    name: 'Kiropraktik',
    group: 'body_health',
    queryCategory: 'Kiropraktik',
    description: 'Undersökning, diagnostik och manuell ledjustering för att minska smärta och återställa rörlighet.',
    img: '/assets/chiro_new.jpg',
    popularTreatments: ['Nybesök kiropraktik', 'Återbesök & Justering', 'Nackspärr & Ryggskott', 'Ischiasbehandling'],
    icon: Activity,
  },
  {
    id: 'naprapathy',
    name: 'Naprapati',
    group: 'body_health',
    queryCategory: 'Naprapati',
    description: 'Helhetstänk för muskler och leder. Kombination av manipulation, mobilisering, massage och rehabilitering.',
    img: '/assets/napra_new.jpg',
    popularTreatments: ['Naprapatbehandling', 'Stötvågsbehandling', 'Dry Needling', 'Ergonomisk rådgivning'],
    icon: HandMetal,
  },
  {
    id: 'teeth',
    name: 'Tandblekning',
    group: 'skin_aesthetic',
    queryCategory: 'Tandblekning',
    description: 'Skonsam klinikblekning för ett vitare, fräschare leende med professionell utrustning och säkra metoder.',
    img: '/assets/whitening_new.jpg',
    popularTreatments: ['Klinikblekning med LED', 'Laserblekning', 'Konsultation & Nyansmätning'],
    icon: SmilePlus,
  },
  {
    id: 'piercing',
    name: 'Piercing & Tatuering',
    group: 'body_health',
    queryCategory: 'Piercing',
    description: 'Steril och trygg öron- och kroppspiercing samt konstnärlig tatuering utförd av professionella artister.',
    img: '/assets/piercing_new.jpg',
    popularTreatments: ['Öronhåltagning / Helix', 'Näs- & Septumpiercing', 'Navelpiercing', 'Specialdesignad tatuering'],
    icon: CircleDot,
  },
];

const GROUPS = [
  { id: 'all', label: 'Alla kategorier' },
  { id: 'hair', label: 'Hår & Barberare' },
  { id: 'nails_lashes', label: 'Naglar & Fransar' },
  { id: 'skin_aesthetic', label: 'Hudvård & Estetik' },
  { id: 'massage_spa', label: 'Massage & Spa' },
  { id: 'body_health', label: 'Kropp & Hälsa' },
];

export default function CategoriesPage() {
  const { t } = useLanguage();
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = useMemo(() => {
    return CATEGORIES.filter(cat => {
      const matchesGroup = activeGroup === 'all' || cat.group === activeGroup;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        cat.name.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q) ||
        cat.popularTreatments.some(t => t.toLowerCase().includes(q));
      return matchesGroup && matchesSearch;
    });
  }, [activeGroup, searchTerm]);

  return (
    <div className="min-h-screen bg-background dark:bg-[#0A0A0A] text-foreground transition-colors duration-300">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-champagne-500/10 text-champagne-600 dark:text-champagne-400 text-xs font-bold uppercase tracking-[0.2em]">
            <Sparkles size={14} /> Komplett Utbud
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-normal tracking-tight text-foreground">
            Alla Kategorier
          </h1>
          <p className="text-foreground/60 text-sm sm:text-base md:text-lg font-light leading-relaxed">
            Hitta rätt behandling bland Nordens främsta frisörer, terapeuter, kliniker och skönhetssalonger.
          </p>

          {/* Search bar */}
          <div className="pt-4 max-w-xl mx-auto">
            <div className="relative flex items-center bg-card border border-border shadow-md rounded-2xl p-2 focus-within:border-champagne-500 focus-within:ring-2 focus-within:ring-champagne-500/20 transition-all">
              <Search className="text-foreground/40 ml-3 shrink-0" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Sök kategori eller specifik behandling (t.ex. balayage, gellack, botox)..."
                className="w-full px-3 py-2 bg-transparent outline-none text-sm font-medium text-foreground placeholder:text-foreground/30"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3 text-xs font-bold text-foreground/40 hover:text-foreground"
                >
                  Rensa
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-center flex-wrap gap-2 mb-12">
          {GROUPS.map(group => {
            const isActive = activeGroup === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setActiveGroup(group.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-foreground text-background shadow-md'
                    : 'bg-card border border-border text-foreground/60 hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                {group.label}
              </button>
            );
          })}
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/60">
          <p className="text-xs uppercase tracking-widest font-bold text-foreground/40">
            Visar {filteredCategories.length} av {CATEGORIES.length} kategorier
          </p>
          <Link
            href="/explore"
            className="text-xs font-bold uppercase tracking-wider text-champagne-600 dark:text-champagne-400 hover:underline inline-flex items-center gap-1.5"
          >
            Se alla salonger på karta & lista <ArrowRight size={14} />
          </Link>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border p-8 space-y-4">
            <p className="text-foreground/50 text-sm">Ingen kategori matchade din sökning &rdquo;{searchTerm}&rdquo;.</p>
            <button
              onClick={() => { setSearchTerm(''); setActiveGroup('all'); }}
              className="text-xs font-bold uppercase tracking-wider text-champagne-600 hover:underline"
            >
              Återställ filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredCategories.map((cat, idx) => {
              const IconComponent = cat.icon;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-card rounded-3xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                >
                  {/* Image header */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={cat.img}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        (e.target as any).src = `https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    
                    <div className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 text-champagne-400 flex items-center justify-center">
                      <IconComponent size={18} />
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-heading text-2xl font-normal drop-shadow-md">
                        {cat.name}
                      </h3>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                    <p className="text-foreground/60 text-xs sm:text-sm font-light leading-relaxed">
                      {cat.description}
                    </p>

                    {/* Popular treatment chips */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 block">
                        Populära behandlingar:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.popularTreatments.map((treatment) => (
                          <Link
                            key={treatment}
                            href={`/explore?q=${encodeURIComponent(treatment)}`}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-foreground/[0.04] hover:bg-champagne-500/15 hover:text-champagne-600 dark:hover:text-champagne-400 border border-border/60 transition-colors"
                          >
                            {treatment}
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Action Link */}
                    <div className="pt-2 border-t border-border/40">
                      <Link
                        href={`/explore?category=${encodeURIComponent(cat.queryCategory)}`}
                        className="w-full bg-foreground text-background py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-champagne-600 hover:text-white transition-all shadow-sm active:scale-95"
                      >
                        <span>Hitta {cat.name}</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Bottom Banner */}
        <div className="mt-20 bg-gradient-to-r from-card to-foreground/[0.02] border border-border rounded-3xl p-8 sm:p-12 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-heading font-normal text-foreground">
            Hittar du inte det du söker?
          </h2>
          <p className="text-foreground/50 text-sm max-w-lg mx-auto">
            Sök fritt på behandlingar, städer eller specifika salongsnamn på vår upptäcktsida.
          </p>
          <div className="pt-2">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-champagne-500 hover:bg-champagne-400 text-black rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              <span>Utforska alla salonger</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
