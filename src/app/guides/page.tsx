'use client';

import Header from "@/components/layout/Header";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { BookOpen, Sparkles, ArrowRight, Clock, Eye, Paintbrush, Scissors, EyeIcon, Droplets } from "lucide-react";
import clsx from "clsx";
import { useLanguage } from "@/context/LanguageContext";

type Category = 'all' | 'nails' | 'lashes' | 'hair' | 'brows' | 'skincare';

interface Guide {
    id: string;
    category: Category;
    title: string;
    excerpt: string;
    readTime: string;
    tips: string[];
}

const CATEGORY_DEFINITIONS: { 
    key: Category; 
    labelSv: string; 
    labelNo: string; 
    labelDa: string; 
    labelFi: string; 
    labelIs: string; 
    labelEn: string; 
    icon: React.ReactNode 
}[] = [
    { key: 'all', labelSv: 'Alla', labelNo: 'Alle', labelDa: 'Alle', labelFi: 'Kaikki', labelIs: 'Allt', labelEn: 'All', icon: <Sparkles size={14} /> },
    { key: 'nails', labelSv: 'Naglar', labelNo: 'Negler', labelDa: 'Negle', labelFi: 'Kynnet', labelIs: 'Neglur', labelEn: 'Nails', icon: <Paintbrush size={14} /> },
    { key: 'lashes', labelSv: 'Fransar', labelNo: 'Vipper', labelDa: 'Vipper', labelFi: 'Ripset', labelIs: 'Augnhár', labelEn: 'Lashes', icon: <EyeIcon size={14} /> },
    { key: 'hair', labelSv: 'Hår', labelNo: 'Hår', labelDa: 'Hår', labelFi: 'Hiukset', labelIs: 'Hár', labelEn: 'Hair', icon: <Scissors size={14} /> },
    { key: 'brows', labelSv: 'Bryn', labelNo: 'Bryn', labelDa: 'Bryn', labelFi: 'Kulmat', labelIs: 'Augabrúnir', labelEn: 'Brows', icon: <Eye size={14} /> },
    { key: 'skincare', labelSv: 'Hudvård', labelNo: 'Hudpleie', labelDa: 'Hudpleje', labelFi: 'Ihonhoito', labelIs: 'Húðumhirða', labelEn: 'Skincare', icon: <Droplets size={14} /> },
];

const GUIDES_SV: Guide[] = [
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
    {
        id: 'lashes-1',
        category: 'lashes',
        title: 'Hur du tvättar fransar rätt',
        excerpt: 'Ren fransraden är nyckeln till hållbara och friska fransar.',
        readTime: '2 min',
        tips: [
            'Använd en oljefri franstvätt eller speciellt skumrengöring',
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
            'Borsta fransarna dagligen med en ren spoolie-borste',
            'Undvik oljebaserad makeup och rengöring',
            'Sov med en silkeskuddöverdrag för att minska friktion',
            'Undvik att gnugga ögonen',
            'Boka påfyllning var 2–3 vecka för att hålla dem fulla',
        ],
    },
    {
        id: 'hair-1',
        category: 'hair',
        title: 'Hur ofta du bör tvätta håret',
        excerpt: 'Rätt tvättfrekvens gör stor skillnad för hårets hälsa.',
        readTime: '3 min',
        tips: [
            'Normalt hår: 2–3 gånger i veckan',
            'Torrt hår: 1–2 gånger i veckan',
            'Fett hår: Varannan dag, men undvik daglig tvätt',
            'Använd sulfatfritt schampo för att bevara färg och fukt',
            'Använd torrschampo mellan tvättarna för fräschhet',
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
            'Undvik hårt uppsatt hår som skapar onödig spänning',
            'Sov med ett silkesörngott för att minska friktion och friss',
            'Undvik att borsta vått hår – använd en bredtandad kam',
        ],
    },
    {
        id: 'hair-3',
        category: 'hair',
        title: 'Värmeskyddsguide',
        excerpt: 'Allt du behöver veta om värmeskydd och rätt temperatur.',
        readTime: '2 min',
        tips: [
            'Använd alltid värmeskydd innan plattång, locktång eller fön',
            'Max 180°C för de flesta normala hårtyper',
            'Fint och skadat hår – max 150°C',
            'Låt håret lufttorka till 80% innan du fönar',
            'Använd keramiska verktyg för jämnare värmefördelning',
        ],
    },
    {
        id: 'brows-1',
        category: 'brows',
        title: 'Så sköter du bryn efter threading',
        excerpt: 'Rätt eftervård ger längre hållbarhet och lugnare hud.',
        readTime: '2 min',
        tips: [
            'Undvik att röra området direkt efter behandlingen',
            'Applicera aloe vera-gel för att lugna huden',
            'Undvik makeup på brynområdet i minst 12 timmar',
            'Skippa bastu och intensiv träning samma dag',
            'Använd brynserum för att stimulera frisk tillväxt',
        ],
    },
    {
        id: 'skin-1',
        category: 'skincare',
        title: 'Grundrutin för strålande hud',
        excerpt: 'En enkel men effektiv hudvårdsrutin för alla hudtyper.',
        readTime: '4 min',
        tips: [
            'Rengör morgon och kväll med en mild rengöring',
            'Använd serum med hyaluronsyra för intensiv fukt',
            'Applicera dagkräm med SPF varje morgon – även vid molnigt väder',
            'Använd närande nattkräm eller ansiktsolja på kvällen',
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
            'Undvik aktiva ingredienser (retinol, starka syror) 48h före behandling',
            'Kom med ren hud utan makeup',
            'Direkt efter: undvik sol, svett och makeup i 24h',
            'Drick extra vatten för att hjälpa huden återhämta sig',
            'Boka din nästa behandling inom 4–6 veckor för bästa resultat',
        ],
    },
];

const GUIDES_NO: Guide[] = [
    {
        id: 'nails-1',
        category: 'nails',
        title: 'Hvordan få neglene til å vare lenger',
        excerpt: 'Maksimer holdbarheten på dine gelenegler med riktige rutiner og vaner.',
        readTime: '3 min',
        tips: [
            'Unngå å utsette neglene for høy varme eller varmt vann de første 48 timene',
            'Bruk alltid gummihansker ved oppvask og rengjøring',
            'Påfør negleolje daglig for å gi næring og fuktighet til neglebåndet',
            'Bruk aldri neglene som verktøy – det skaper mikroskader og løft',
            'Bestill etterfylling hver 2.–3. uke for best resultat',
        ],
    },
    {
        id: 'nails-2',
        category: 'nails',
        title: 'Slik unngår du at neglene slipper',
        excerpt: 'De vanligste årsakene til at negler løsner – og hvordan du forebygger det.',
        readTime: '2 min',
        tips: [
            'Sørg for at neglene er fri for oljer og kremer før behandlingen',
            'Unngå å bløte hendene rett før timen din',
            'Hold neglene unna ren aceton og sterke rengjøringsmidler',
            'Ikke pell på et lite løft – bestill heller en rask reparasjon',
        ],
    },
    {
        id: 'nails-3',
        category: 'nails',
        title: 'Builder gel vs gel polish – forskjellen',
        excerpt: 'Velg riktig produkt basert på din livsstil og dine ønsker.',
        readTime: '3 min',
        tips: [
            'Gel polish er tynnere og mer fleksibel – perfekt for korte, naturlige negler',
            'Builder gel gir ekstra styrke og struktur – ideelt for forlengelser og svake negler',
            'Builder gel kan formes og bygges opp for kreative former',
            'Gel polish er skånsommere og raskere å fjerne',
            'Hør med negledesigneren din hva som passer best for akkurat dine negler',
        ],
    },
    {
        id: 'lashes-1',
        category: 'lashes',
        title: 'Hvordan vaske vipper riktig',
        excerpt: 'En ren vippelinje er nøkkelen til god holdbarhet og sunne vipper.',
        readTime: '2 min',
        tips: [
            'Bruk en oljefri vippesjampo eller spesialsåpe for vipper',
            'Vask forsiktig med en myk vippebørste i sirkelbevegelser',
            'Skyll grundig med lunkent vann – unngå hard dusjstråle',
            'Klapp forsiktig tørt med et lofritt håndkle',
            'Vask vippene minst annenhver dag for best holdbarhet',
        ],
    },
    {
        id: 'lashes-2',
        category: 'lashes',
        title: 'Dette må du unngå de første 24 timene',
        excerpt: 'De første timene er avgjørende for at vippelimmet herder optimalt.',
        readTime: '2 min',
        tips: [
            'Unngå vann, damp og badstue de første 24 timene',
            'Sov på ryggen for å unngå trykk mot puten',
            'Ikke gni, ta på eller dra i vippene',
            'Unngå maskara og alle oljebaserte produkter rundt øynene',
            'Dropp hard trening og svetteøkter det første døgnet',
        ],
    },
    {
        id: 'lashes-3',
        category: 'lashes',
        title: 'Slik får du vippene til å vare lenger',
        excerpt: 'Forleng tiden mellom påfyll med disse enkle hverdagsrutinene.',
        readTime: '3 min',
        tips: [
            'Børst vippene daglig med en ren spoolie-børste',
            'Bruk alltid oljefri sminkefjerner og hudpleie',
            'Sov på et silke- eller satengputevar for å redusere friksjon',
            'Gni aldri øynene med fingre eller håndkle',
            'Bestill påfyll hver 2.–3. uke for å holde dem fyldige',
        ],
    },
    {
        id: 'hair-1',
        category: 'hair',
        title: 'Hvor ofte bør du vaske håret',
        excerpt: 'Riktig vaskefrekvens utgjør en stor forskjell for hårets helse.',
        readTime: '3 min',
        tips: [
            'Normalt hår: 2–3 ganger i uken',
            'Tørt eller krøllete hår: 1–2 ganger i uken',
            'Fett hår: Annenhver dag, men unngå daglig sjamponering',
            'Bruk sulfatfri sjampo for å bevare farge og naturlig fuktighet',
            'Bruk tørrsjampo mellom vask for friskhet og volum',
        ],
    },
    {
        id: 'hair-2',
        category: 'hair',
        title: 'Beskytt håret mellom frisørbesøk',
        excerpt: 'Enkle steg for å bevare håret sunt, glansfullt og sterkt.',
        readTime: '2 min',
        tips: [
            'Bruk alltid varmebeskyttelse før styling med varmeverktøy',
            'Påfør hårolje i spissene for ekstra fuktighet og forsegling',
            'Unngå for stramme hestehaler som skaper slitasje på hårstråene',
            'Sov med silkeputevar for å unngå floker og slitte tupper',
            'Unngå å børste vått hår kraftig – bruk en bredtannet kam',
        ],
    },
    {
        id: 'hair-3',
        category: 'hair',
        title: 'Guide til varmebeskyttelse og temperatur',
        excerpt: 'Alt du må vite om varmebeskyttende produkter og riktig varme.',
        readTime: '2 min',
        tips: [
            'Påfør alltid varmebeskyttelse før rettetang, krølltang eller føner',
            'Maks 180°C for normalt hår',
            'Fint, bleket eller skadet hår: maks 150°C',
            'La håret lufttørke 80% før du begynner med rundbørsteføn',
            'Bruk keramiske eller tourmaline-verktøy for jevn varmefordeling',
        ],
    },
    {
        id: 'brows-1',
        category: 'brows',
        title: 'Slik pleier du bryn etter threading',
        excerpt: 'Riktig etterpleie gir lengre holdbarhet og beroliget hud.',
        readTime: '2 min',
        tips: [
            'Unngå å berøre området umiddelbart etter behandlingen',
            'Påfør ren aloe vera-gel for å lindre rødhet',
            'Unngå sminke på brynområdet i minst 12 timer',
            'Dropp badstue, soling og hard trening samme dag',
            'Bruk brynserum regelmessig for å fremme sunn vekst',
        ],
    },
    {
        id: 'skin-1',
        category: 'skincare',
        title: 'Grunnrutine for strålende hud',
        excerpt: 'En enkel, men effektiv hudpleierutine for alle hudtyper.',
        readTime: '4 min',
        tips: [
            'Rens morgen og kveld med en mild, skånsom rens',
            'Påfør hyaluronsyreserum på lett fuktig hud for dyp fukt',
            'Bruk bredspektret solkrem med SPF hver morgen – også på overskyede dager',
            'Bruk en nærende nattkrem eller ansiktsolje om kvelden',
            'Eksfolier 1–2 ganger i uken med en mild kjemisk AHA/BHA-peeling',
        ],
    },
    {
        id: 'skin-2',
        category: 'skincare',
        title: 'Før og etter ansiktsbehandling',
        excerpt: 'Forbered huden optimalt og ta godt vare på den etterpå for maksimal glød.',
        readTime: '3 min',
        tips: [
            'Unngå sterke aktive ingredienser (retinol, syrer) 48 timer før timen',
            'Møt opp med ren hud uten tung sminke',
            'Rett etter: unngå sol, intens svetting og sminke i 24 timer',
            'Drikk rikelig med vann for å hjelpe huden med regenereringen',
            'Bestill neste ansiktsbehandling om 4–6 uker for best varig resultat',
        ],
    },
];

const GUIDES_EN: Guide[] = [
    {
        id: 'nails-1',
        category: 'nails',
        title: 'How to make your nails last longer',
        excerpt: 'Maximize the longevity of your gel nails with the right habits and care routine.',
        readTime: '3 min',
        tips: [
            'Avoid exposing nails to high heat or hot water during the first 48 hours',
            'Always wear rubber gloves when washing dishes and cleaning',
            'Apply cuticle oil daily to nourish and hydrate the nail bed',
            'Never use your nails as tools – it creates micro-fractures and lifting',
            'Book a refill appointment every 2–3 weeks for optimal strength',
        ],
    },
    {
        id: 'nails-2',
        category: 'nails',
        title: 'How to prevent nail lifting',
        excerpt: 'The most common causes of lifting – and how to easily prevent them.',
        readTime: '2 min',
        tips: [
            'Ensure nails are clean and free of hand lotions before your appointment',
            'Avoid soaking your hands in water immediately prior to your visit',
            'Keep nails away from pure acetone and harsh household chemicals',
            'Never pick or peel a lifted corner – book a quick professional fix instead',
        ],
    },
    {
        id: 'nails-3',
        category: 'nails',
        title: 'Builder gel vs. gel polish – the difference',
        excerpt: 'Choose the ideal product based on your lifestyle and nail goals.',
        readTime: '3 min',
        tips: [
            'Gel polish is thinner and flexible – best for short, natural nails',
            'Builder gel provides structure and durability – ideal for extensions and weak nails',
            'Builder gel can be sculpted to create arches and custom shapes',
            'Gel polish is faster and gentler to soak off',
            'Consult with your nail artist to find the perfect formula for your nails',
        ],
    },
    {
        id: 'lashes-1',
        category: 'lashes',
        title: 'How to properly clean lash extensions',
        excerpt: 'A clean lash line is essential for retention and healthy natural lashes.',
        readTime: '2 min',
        tips: [
            'Use an oil-free lash cleanser or specialized lash foam shampoo',
            'Gently cleanse using a soft lash brush with gentle circular motions',
            'Rinse thoroughly with lukewarm water – avoid strong shower pressure',
            'Pat dry gently with a clean, lint-free cloth or paper towel',
            'Wash your lashes at least every other day for the best retention',
        ],
    },
    {
        id: 'lashes-2',
        category: 'lashes',
        title: 'What to avoid during the first 24h',
        excerpt: 'The first 24 hours are crucial for proper adhesive bonding.',
        readTime: '2 min',
        tips: [
            'Avoid contact with water, heavy steam, and saunas for 24 hours',
            'Sleep on your back to prevent crushing lashes against your pillow',
            'Do not rub, touch, or pick at your lash extensions',
            'Avoid mascara and all oil-based cosmetics near the eyes',
            'Skip intense workouts and hot yoga sessions on the first day',
        ],
    },
    {
        id: 'lashes-3',
        category: 'lashes',
        title: 'How to make your lashes last longer',
        excerpt: 'Extend the duration between infills with these simple daily habits.',
        readTime: '3 min',
        tips: [
            'Gently brush your lashes daily using a clean spoolie brush',
            'Always use oil-free makeup removers and water-based skincare',
            'Sleep on a silk or satin pillowcase to minimize friction',
            'Never rub your eyes with your fingers or a towel',
            'Book an infill every 2–3 weeks to keep them looking full and lush',
        ],
    },
    {
        id: 'hair-1',
        category: 'hair',
        title: 'How often you should wash your hair',
        excerpt: 'The right washing frequency makes a major difference in hair health.',
        readTime: '3 min',
        tips: [
            'Normal hair: 2–3 times per week',
            'Dry or textured hair: 1–2 times per week',
            'Oily hair: Every other day, but avoid stripping daily washes',
            'Use a sulfate-free shampoo to preserve vibrant color and moisture',
            'Use dry shampoo between washes for root freshness and volume',
        ],
    },
    {
        id: 'hair-2',
        category: 'hair',
        title: 'Protecting your hair between salon visits',
        excerpt: 'Simple daily steps to keep your locks healthy, glossy, and vibrant.',
        readTime: '2 min',
        tips: [
            'Always apply a heat protectant spray or cream before thermal styling',
            'Apply a few drops of nourishing hair oil to ends for hydration',
            'Avoid overly tight elastics and updos that cause tension breakage',
            'Sleep on a silk pillowcase to prevent friction, tangles, and split ends',
            'Never aggressively brush wet hair – use a wide-tooth detangling comb',
        ],
    },
    {
        id: 'hair-3',
        category: 'hair',
        title: 'Heat protection & temperature guide',
        excerpt: 'Everything you need to know about thermal protection and proper heat.',
        readTime: '2 min',
        tips: [
            'Always apply heat protectant before straighteners, curling wands, or blowouts',
            'Keep irons at a maximum of 180°C (350°F) for normal hair types',
            'Fine, bleached, or fragile hair: stay below 150°C (300°F)',
            'Allow hair to air-dry to 80% before starting a round-brush blowout',
            'Choose ceramic or tourmaline tools for even heat distribution without hot spots',
        ],
    },
    {
        id: 'brows-1',
        category: 'brows',
        title: 'How to care for brows after threading',
        excerpt: 'Proper aftercare ensures calmer skin and sharp, clean results.',
        readTime: '2 min',
        tips: [
            'Avoid touching the brow area immediately following treatment',
            'Apply pure cooling aloe vera gel to soothe and calm redness',
            'Avoid applying makeup or foundations to the brow area for at least 12 hours',
            'Skip saunas, direct sun tanning, and heavy sweat sessions on the same day',
            'Apply a nourishing brow serum at bedtime to encourage healthy hair growth',
        ],
    },
    {
        id: 'skin-1',
        category: 'skincare',
        title: 'Essential routine for radiant skin',
        excerpt: 'A streamlined yet highly effective daily skincare routine for all skin types.',
        readTime: '4 min',
        tips: [
            'Cleanse morning and night with a gentle, non-stripping cleanser',
            'Apply a hyaluronic acid serum on damp skin to lock in deep hydration',
            'Apply broad-spectrum SPF every single morning – even on cloudy days',
            'Use a rich barrier-repair cream or facial oil in the evening',
            'Gently exfoliate 1–2 times weekly with a mild AHA/BHA chemical exfoliant',
        ],
    },
    {
        id: 'skin-2',
        category: 'skincare',
        title: 'Pre- & post-care for facials',
        excerpt: 'How to prep your skin and take proper care of it afterwards for maximum glow.',
        readTime: '3 min',
        tips: [
            'Avoid strong active ingredients (retinol, strong peels) 48 hours before treatment',
            'Arrive at the salon with clean skin free of heavy makeup',
            'Directly afterwards: avoid sun exposure, heavy sweating, and makeup for 24 hours',
            'Drink extra water throughout the day to support skin regeneration and lymphatic flow',
            'Schedule your next facial treatment in 4–6 weeks for cumulative, lasting results',
        ],
    },
];

export default function GuidesPage() {
    const { language } = useLanguage();
    const isEn = language === 'English';
    const isNo = language === 'Norska';
    const isDa = language === 'Danska';

    const [activeCategory, setActiveCategory] = useState<Category>('all');
    const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

    const getCatLabel = (c: typeof CATEGORY_DEFINITIONS[0]) => {
        if (isEn) return c.labelEn;
        if (isNo) return c.labelNo;
        if (isDa) return c.labelDa;
        return c.labelSv;
    };

    const categories = CATEGORY_DEFINITIONS.map(c => ({
        key: c.key,
        label: getCatLabel(c),
        icon: c.icon
    }));

    const guideList = isEn ? GUIDES_EN : isNo ? GUIDES_NO : GUIDES_SV;

    const filteredGuides = activeCategory === 'all'
        ? guideList
        : guideList.filter(g => g.category === activeCategory);

    // Dynamic UI labels
    const heroTitle = isEn
        ? <>Expert Guidance & <span className="text-champagne-500">Care</span></>
        : isNo
        ? <>Rådgivning & <span className="text-champagne-500">pleie</span></>
        : isDa
        ? <>Rådgivning & <span className="text-champagne-500">pleje</span></>
        : <>Rådgivning & <span className="text-champagne-500">skötsel</span></>;

    const heroSubtitle = isEn
        ? "Tips and expert advice for maintaining your hair, nails, lashes, and skin between salon visits."
        : isNo
        ? "Tips og veiledning for å ta vare på hår, negler, vipper og hud mellom besøkene dine."
        : isDa
        ? "Tips og råd til at pleje hår, negle, vipper og hud mellem dine behandlinger."
        : "Tips och guider för att ta hand om hår, naglar, fransar och hud mellan dina besök.";

    const quickTipsLabel = isEn ? "Quick Tips" : isNo ? "Raske tips" : isDa ? "Hurtige råd" : "Snabba tips";
    const readyToBookLabel = isEn ? "Ready to book?" : isNo ? "Klar til å bestille?" : isDa ? "Klar til at booke?" : "Redo att boka?";
    const discoverNearYou = isEn ? "Discover top providers near you" : isNo ? "Se salonger i nærheten av deg" : isDa ? "Find saloner nær dig" : "Se utförare nära dig";
    const exploreLabel = isEn ? "Explore" : isNo ? "Utforsk" : isDa ? "Udforsk" : "Utforska";
    const ctaTitle = isEn ? "Create an account to book" : isNo ? "Opprett konto for å bestille" : isDa ? "Opret konto for at booke" : "Skapa konto för att boka";
    const ctaDesc = isEn
        ? "Join Glowbook to access verified luxury salons, earn rewards, and receive personalized recommendations."
        : isNo
        ? "Bli medlem i Glowbook og få tilgang til eksklusive utførere, belønninger og personlige anbefalinger."
        : isDa
        ? "Bliv medlem af Glowbook og få adgang til eksklusive saloner, fordele og personlige anbefalinger."
        : "Bli medlem i Glowbook och få tillgång till exklusiva utförare, rewards och personliga rekommendationer.";
    const ctaBtn = isEn ? "Create account" : isNo ? "Opprett konto" : isDa ? "Opret konto" : "Skapa konto";

    return (
        <div className="min-h-screen bg-[#FDFBF9] dark:bg-black text-black dark:text-white font-sans transition-colors duration-500">
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
                                <BookOpen size={12} /> {isEn ? "Glowbook Expert Guide" : "Glowbook Ekspertguide"}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-heading font-bold text-black dark:text-white tracking-tight">
                                {heroTitle}
                            </h1>
                            <p className="text-black/40 dark:text-white/40 text-lg max-w-xl mx-auto leading-relaxed">
                                {heroSubtitle}
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Category Filter */}
                <section className="px-6 mb-12">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {categories.map(cat => (
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
                                key={`${activeCategory}-${language}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-5"
                            >
                                {filteredGuides.map((guide, i) => {
                                    const isExpanded = expandedGuide === guide.id;
                                    const currentCatLabel = categories.find(c => c.key === guide.category)?.label;

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
                                                                {categories.find(c => c.key === guide.category)?.icon}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-champagne-600 uppercase tracking-widest">
                                                                {currentCatLabel}
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
                                                                    {quickTipsLabel}
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
                                                                    <p className="text-sm font-bold text-black dark:text-white">
                                                                        {readyToBookLabel}
                                                                    </p>
                                                                    <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">
                                                                        {discoverNearYou}
                                                                    </p>
                                                                </div>
                                                                <Link
                                                                    href="/explore"
                                                                    className="px-5 py-2.5 bg-black dark:bg-champagne-600 text-white rounded-full text-xs font-bold hover:bg-champagne-600 transition-all shadow-md flex items-center gap-1.5"
                                                                >
                                                                    {exploreLabel} <ArrowRight size={12} />
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
                                <h2 className="text-2xl md:text-3xl font-heading font-bold">
                                    {ctaTitle}
                                </h2>
                                <p className="text-white/40 max-w-md mx-auto">
                                    {ctaDesc}
                                </p>
                                <div className="flex items-center justify-center gap-4">
                                    <Link
                                        href="/auth/register"
                                        className="premium-glow-button px-8 py-3.5 text-sm font-bold"
                                    >
                                        {ctaBtn}
                                    </Link>
                                    <Link
                                        href="/explore"
                                        className="px-8 py-3.5 bg-white/10 text-white border border-white/20 rounded-full text-sm font-bold hover:bg-white/20 transition-all"
                                    >
                                        {exploreLabel}
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