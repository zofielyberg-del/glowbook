'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { Shield, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const SECTIONS = [
    { id: 'om-glowbook', title: 'Om Glowbook' },
    { id: 'konto-och-anvandning', title: 'Konto och Användning' },
    { id: 'bokningar-och-ansvar', title: 'Bokningar och Ansvar' },
    { id: 'avbokning-och-no-show', title: 'Avbokning och No Show' },
    { id: 'betalningar-och-abonnemang', title: 'Betalningar och Abonnemang' },
    { id: 'aterbetalningar', title: 'Återbetalningar' },
    { id: 'utforarvillkor', title: 'Utförarvillkor' },
    { id: 'community-riktlinjer', title: 'Community Riktlinjer' },
    { id: 'integritetspolicy', title: 'Integritetspolicy (GDPR)' },
    { id: 'cookies', title: 'Cookies' },
    { id: 'ansvarsbegransning', title: 'Ansvarsbegränsning' },
    { id: 'andringar-av-villkor', title: 'Ändringar av Villkor' },
    { id: 'kontakt', title: 'Kontakt' },
];

function SectionCard({
    id,
    title,
    children,
    index,
}: {
    id: string;
    title: string;
    children: React.ReactNode;
    index: number;
}) {
    return (
        <motion.section
            id={id}
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
            className="scroll-mt-28"
        >
            <div className="bg-card dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-[2rem] p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow duration-500">
                <h2 className="font-heading font-black text-xl md:text-2xl text-foreground mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-champagne-500/10 dark:bg-champagne-500/5 flex items-center justify-center text-champagne-600 text-xs font-black">
                        {index + 1}
                    </span>
                    {title}
                </h2>
                <div className="text-foreground/60 dark:text-white/50 text-sm leading-relaxed space-y-4 font-medium">
                    {children}
                </div>
            </div>
        </motion.section>
    );
}

function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2 pl-1">
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-champagne-500/50 shrink-0" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

export default function PoliciesPage() {
    const [activeSection, setActiveSection] = useState('');

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                }
            },
            { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 }
        );

        SECTIONS.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-background dark:bg-black transition-colors duration-500 font-body">
            <Header />

            <main className="pt-28 pb-24">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center px-6 pb-16"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-champagne-500/10 dark:bg-champagne-500/5 text-champagne-600 mb-6 shadow-inner">
                        <Shield size={28} />
                    </div>
                    <h1 className="font-heading text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
                        Policies & <span className="text-champagne-600">Användarvillkor</span>
                    </h1>
                    <p className="text-foreground/40 dark:text-white/40 text-base md:text-lg font-medium max-w-xl mx-auto">
                        Senast uppdaterad: 2026
                    </p>
                    <div className="mt-6 max-w-2xl mx-auto text-sm text-foreground/50 dark:text-white/40 leading-relaxed">
                        <p>
                            Detta dokument beskriver villkor, integritetspolicy, betalningspolicy och riktlinjer för användning av Glowbook. Genom att skapa ett konto eller använda tjänsten godkänner du samtliga villkor nedan.
                        </p>
                    </div>
                </motion.div>

                <div className="max-w-screen-xl mx-auto px-6 lg:px-20 flex gap-12">
                    {/* Sidebar – Table of Contents (desktop) */}
                    <aside className="hidden lg:block w-64 shrink-0">
                        <div className="sticky top-28 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/25 dark:text-white/20 mb-4 pl-3">
                                Innehåll
                            </p>
                            {SECTIONS.map(({ id, title }) => (
                                <a
                                    key={id}
                                    href={`#${id}`}
                                    className={`block text-[13px] py-2 px-3 rounded-xl transition-all duration-300 ${activeSection === id
                                            ? 'bg-champagne-500/10 dark:bg-champagne-500/5 text-champagne-700 dark:text-champagne-400 font-bold'
                                            : 'text-foreground/40 dark:text-white/30 hover:text-foreground/70 dark:hover:text-white/60 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                                        }`}
                                >
                                    {title}
                                </a>
                            ))}
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1 space-y-6 min-w-0">
                        {/* 1: Om Glowbook */}
                        <SectionCard id="om-glowbook" title="Om Glowbook" index={0}>
                            <p>
                                Glowbook är en digital bokningsplattform som kopplar samman kunder med oberoende skönhets- och serviceutförare inom exempelvis naglar, hår, fransar, hudvård och liknande tjänster.
                            </p>
                            <p>
                                Glowbook fungerar enbart som teknisk plattform och är inte arbetsgivare, salong eller behandlare. Alla behandlingar, priser och resultat ansvaras av respektive utförare.
                            </p>
                            <p>
                                Genom att använda Glowbook accepterar du att bokningar sker direkt mellan kund och utförare.
                            </p>
                        </SectionCard>

                        {/* 2: Konto och Användning */}
                        <SectionCard id="konto-och-anvandning" title="Konto och Användning" index={1}>
                            <p>För att använda Glowbook krävs ett registrerat konto.</p>
                            <p className="font-semibold text-foreground/70 dark:text-white/60">Du ansvarar för att:</p>
                            <BulletList
                                items={[
                                    'Ange korrekt information',
                                    'Hålla inloggningsuppgifter säkra',
                                    'Uppdatera kontaktuppgifter vid ändringar',
                                ]}
                            />
                            <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">
                                Glowbook förbehåller sig rätten att stänga eller begränsa konton vid:
                            </p>
                            <BulletList
                                items={[
                                    'Missbruk av plattformen',
                                    'Falsk information',
                                    'Trakasserier eller hot',
                                    'Bedrägeriförsök',
                                    'Brott mot dessa villkor',
                                ]}
                            />
                            <p className="pt-2">
                                Användare måste vara minst 16 år. För vissa behandlingar kan 18-årsgräns gälla enligt utförare.
                            </p>
                        </SectionCard>

                        {/* 3: Bokningar och Ansvar */}
                        <SectionCard id="bokningar-och-ansvar" title="Bokningar och Ansvar" index={2}>
                            <p>Alla bokningar sker direkt mellan kund och utförare.</p>
                            <p className="font-semibold text-foreground/70 dark:text-white/60">Utföraren ansvarar för:</p>
                            <BulletList
                                items={[
                                    'Behandlingar',
                                    'Hygien',
                                    'Certifikat och utbildning',
                                    'Prisinformation',
                                    'Kundservice',
                                    'Resultat',
                                ]}
                            />
                            <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">Glowbook ansvarar inte för:</p>
                            <BulletList
                                items={[
                                    'Missnöje med behandling',
                                    'Allergiska reaktioner',
                                    'Skador',
                                    'Inställda tider',
                                    'Ekonomiska tvister',
                                    'Uteblivna besök',
                                ]}
                            />
                            <p className="pt-2">Eventuella tvister ska lösas direkt mellan kund och utförare.</p>
                        </SectionCard>

                        {/* 4: Avbokning och No Show */}
                        <SectionCard id="avbokning-och-no-show" title="Avbokning och No Show" index={3}>
                            <p>Varje utförare sätter sin egen avbokningspolicy.</p>
                            <p className="font-semibold text-foreground/70 dark:text-white/60">Kunder ansvarar för att:</p>
                            <BulletList
                                items={[
                                    'Avboka i tid',
                                    'Respektera utförarens regler',
                                    'Betala eventuella no show-avgifter',
                                ]}
                            />
                            <p className="pt-2">
                                Glowbook ansvarar inte för avgifter som debiteras av utförare vid sen avbokning eller uteblivet besök.
                            </p>
                        </SectionCard>

                        {/* 5: Betalningar och Abonnemang */}
                        <SectionCard id="betalningar-och-abonnemang" title="Betalningar och Abonnemang" index={4}>
                            <p>Glowbook erbjuder abonnemang och tjänster för utförare.</p>
                            <p className="font-semibold text-foreground/70 dark:text-white/60">Alla abonnemang:</p>
                            <BulletList
                                items={[
                                    'Debiteras månadsvis',
                                    'Förnyas automatiskt',
                                    'Kan sägas upp när som helst innan nästa period',
                                ]}
                            />
                            <p className="pt-2">Påbörjad abonnemangsperiod återbetalas inte.</p>
                            <p>
                                Vid utebliven betalning kan kontot pausas eller begränsas tills betalning genomförts.
                            </p>
                            <p>
                                Glowbook använder externa betalningsleverantörer såsom Stripe och Klarna. Dessa ansvarar för säker betalningshantering.
                            </p>
                            <p className="font-semibold text-champagne-700 dark:text-champagne-400">
                                Glowbook lagrar inte kortuppgifter.
                            </p>
                        </SectionCard>

                        {/* 6: Återbetalningar */}
                        <SectionCard id="aterbetalningar" title="Återbetalningar" index={5}>
                            <p>Glowbook hanterar inte återbetalningar för behandlingar.</p>
                            <p>Alla återbetalningar mellan kund och utförare hanteras direkt mellan parterna.</p>
                            <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">Glowbook återbetalar endast:</p>
                            <BulletList
                                items={[
                                    'Tekniska fel i abonnemang',
                                    'Dubbeldebiteringar',
                                    'Felaktiga systemdebiteringar',
                                ]}
                            />
                            <p className="pt-2">Begäran om detta görs via support.</p>
                        </SectionCard>

                        {/* 7: Utförarvillkor */}
                        <SectionCard id="utforarvillkor" title="Utförarvillkor" index={6}>
                            <p>Utförare som använder Glowbook ansvarar själva för:</p>
                            <BulletList
                                items={[
                                    'Att följa svensk lag och lokala regler',
                                    'Skatter och företag',
                                    'Hygien och säkerhet',
                                    'Korrekta priser',
                                    'Korrekt information',
                                    'Bokningshantering',
                                    'Kundbemötande',
                                ]}
                            />
                            <p className="pt-2">Glowbook är inte arbetsgivare och ansvarar inte för utförares verksamhet.</p>
                            <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">
                                Glowbook kan ta bort utförare som:
                            </p>
                            <BulletList
                                items={[
                                    'Får upprepade klagomål',
                                    'Bryter mot lag',
                                    'Uppträder oprofessionellt',
                                    'Missbrukar systemet',
                                ]}
                            />
                        </SectionCard>

                        {/* 8: Community Riktlinjer */}
                        <SectionCard id="community-riktlinjer" title="Community Riktlinjer" index={7}>
                            <p>Glowbook ska vara en trygg och professionell plattform.</p>
                            <p className="font-semibold text-foreground/70 dark:text-white/60">Följande är inte tillåtet:</p>
                            <BulletList
                                items={[
                                    'Trakasserier eller hot',
                                    'Diskriminering',
                                    'Spam eller falska bokningar',
                                    'Falska recensioner',
                                    'Olämpligt eller sexuellt innehåll',
                                    'Bedrägeriförsök',
                                    'Försök att kringgå betalningssystem',
                                ]}
                            />
                            <p className="pt-2 font-semibold text-red-500/80 dark:text-red-400/70">
                                Brott mot riktlinjer kan leda till permanent avstängning.
                            </p>
                        </SectionCard>

                        {/* 9: Integritetspolicy (GDPR) */}
                        <SectionCard id="integritetspolicy" title="Integritetspolicy (GDPR)" index={8}>
                            <p>Glowbook värnar om din integritet och följer GDPR.</p>
                            <p>Vi samlar endast information som krävs för att tillhandahålla tjänsten.</p>

                            <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">
                                Information som kan samlas:
                            </p>
                            <BulletList
                                items={[
                                    'Namn',
                                    'E-post',
                                    'Telefonnummer',
                                    'Bokningshistorik',
                                    'Kontoinformation',
                                    'Betalningsreferenser via externa betalpartners',
                                ]}
                            />

                            <p className="font-semibold text-champagne-700 dark:text-champagne-400 pt-2">
                                Vi säljer aldrig personuppgifter.
                            </p>

                            <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">Data används för:</p>
                            <BulletList
                                items={[
                                    'Bokningar',
                                    'Betalningar',
                                    'Kundsupport',
                                    'Säkerhet',
                                    'Förbättring av tjänsten',
                                ]}
                            />

                            <p className="pt-2">Data lagras inom EU eller enligt GDPR-standard.</p>

                            <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">Du har rätt att:</p>
                            <BulletList
                                items={[
                                    'Begära registerutdrag',
                                    'Begära radering',
                                    'Korrigera uppgifter',
                                ]}
                            />

                            <div className="pt-4">
                                <Link
                                    href="/support"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-champagne-500/10 dark:bg-champagne-500/5 text-champagne-700 dark:text-champagne-400 font-bold text-sm hover:bg-champagne-500/20 transition-colors duration-300"
                                >
                                    Kontakta Support <ChevronRight size={14} />
                                </Link>
                            </div>
                        </SectionCard>

                        {/* 10: Cookies */}
                        <SectionCard id="cookies" title="Cookies" index={9}>
                            <p>Glowbook använder cookies för:</p>
                            <BulletList
                                items={[
                                    'Inloggning',
                                    'Funktionalitet',
                                    'Analys',
                                    'Förbättrad användarupplevelse',
                                ]}
                            />
                            <p className="pt-2">Genom att använda tjänsten godkänner du detta.</p>
                        </SectionCard>

                        {/* 11: Ansvarsbegränsning */}
                        <SectionCard id="ansvarsbegransning" title="Ansvarsbegränsning" index={10}>
                            <p>Glowbook tillhandahåller plattformen i befintligt skick.</p>
                            <p className="font-semibold text-foreground/70 dark:text-white/60">Glowbook ansvarar inte för:</p>
                            <BulletList
                                items={[
                                    'Indirekta förluster',
                                    'Utebliven inkomst',
                                    'Kundförlust',
                                    'Tekniska avbrott',
                                    'Behandlingars resultat',
                                ]}
                            />
                            <p className="pt-2">
                                Glowbook strävar efter hög driftsäkerhet men garanterar inte oavbruten tjänst.
                            </p>
                        </SectionCard>

                        {/* 12: Ändringar av Villkor */}
                        <SectionCard id="andringar-av-villkor" title="Ändringar av Villkor" index={11}>
                            <p>Glowbook kan när som helst uppdatera dessa villkor.</p>
                            <p>
                                Fortsatt användning av tjänsten innebär godkännande av uppdaterade villkor.
                            </p>
                        </SectionCard>

                        {/* 13: Kontakt */}
                        <SectionCard id="kontakt" title="Kontakt" index={12}>
                            <p>
                                Har du frågor om dessa villkor? Kontakta oss via support.
                            </p>
                            <p><strong className="text-foreground/70 dark:text-white/60">Företag:</strong> Glowbook</p>
                            <div className="pt-4">
                                <Link
                                    href="/support"
                                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-foreground dark:bg-white text-background dark:text-black rounded-full font-bold text-sm hover:bg-champagne-600 hover:text-white transition-all duration-300 shadow-lg active:scale-95"
                                >
                                    Kontakta Kundtjänst <ChevronRight size={14} />
                                </Link>
                            </div>
                        </SectionCard>

                        {/* Closing note */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center py-10"
                        >
                            <p className="text-xs text-foreground/25 dark:text-white/15 font-medium">
                                Detta dokument gäller för alla användare och utförare som använder Glowbook-plattformen.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
