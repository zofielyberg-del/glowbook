'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { Shield, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const SECTIONS_SV = [
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

const SECTIONS_EN = [
    { id: 'om-glowbook', title: 'About Glowbook' },
    { id: 'konto-och-anvandning', title: 'Account & Usage' },
    { id: 'bokningar-och-ansvar', title: 'Bookings & Responsibility' },
    { id: 'avbokning-och-no-show', title: 'Cancellation & No-Show' },
    { id: 'betalningar-och-abonnemang', title: 'Payments & Subscriptions' },
    { id: 'aterbetalningar', title: 'Refunds' },
    { id: 'utforarvillkor', title: 'Provider Terms' },
    { id: 'community-riktlinjer', title: 'Community Guidelines' },
    { id: 'integritetspolicy', title: 'Privacy Policy (GDPR)' },
    { id: 'cookies', title: 'Cookies' },
    { id: 'ansvarsbegransning', title: 'Limitation of Liability' },
    { id: 'andringar-av-villkor', title: 'Amendments to Terms' },
    { id: 'kontakt', title: 'Contact' },
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
    const { language } = useLanguage();
    const isEn = language !== 'Svenska';
    const sections = isEn ? SECTIONS_EN : SECTIONS_SV;
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

        sections.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [sections]);

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
                        Policies &{' '}
                        <span className="text-champagne-600">
                            {isEn ? 'Terms of Service' : 'Användarvillkor'}
                        </span>
                    </h1>
                    <p className="text-foreground/40 dark:text-white/40 text-base md:text-lg font-medium max-w-xl mx-auto">
                        {isEn ? 'Last updated: 2026' : 'Senast uppdaterad: 2026'}
                    </p>
                    <div className="mt-6 max-w-2xl mx-auto text-sm text-foreground/50 dark:text-white/40 leading-relaxed">
                        <p>
                            {isEn
                                ? 'This document outlines the terms, privacy policy, payment policy, and guidelines for using the Glowbook platform. By creating an account or using the service, you agree to all terms stated below.'
                                : 'Detta dokument beskriver villkor, integritetspolicy, betalningspolicy och riktlinjer för användning av Glowbook. Genom att skapa ett konto eller använda tjänsten godkänner du samtliga villkor nedan.'}
                        </p>
                    </div>
                </motion.div>

                <div className="max-w-screen-xl mx-auto px-6 lg:px-20 flex gap-12">
                    {/* Sidebar – Table of Contents (desktop) */}
                    <aside className="hidden lg:block w-64 shrink-0">
                        <div className="sticky top-28 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/25 dark:text-white/20 mb-4 pl-3">
                                {isEn ? 'Table of contents' : 'Innehåll'}
                            </p>
                            {sections.map(({ id, title }) => (
                                <a
                                    key={id}
                                    href={`#${id}`}
                                    className={`block text-[13px] py-2 px-3 rounded-xl transition-all duration-300 ${
                                        activeSection === id
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
                        {/* 1: About Glowbook */}
                        <SectionCard id="om-glowbook" title={sections[0].title} index={0}>
                            {isEn ? (
                                <>
                                    <p>
                                        Glowbook is a digital booking platform connecting customers with independent beauty and wellness providers across nails, hair, lashes, skincare, and related services.
                                    </p>
                                    <p>
                                        Glowbook operates strictly as a technical platform and is neither an employer, salon, nor practitioner. All treatments, pricing, and results are the sole responsibility of the respective provider.
                                    </p>
                                    <p>
                                        By using Glowbook, you acknowledge that bookings are made directly between customer and provider.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p>
                                        Glowbook är en digital bokningsplattform som kopplar samman kunder med oberoende skönhets- och serviceutförare inom exempelvis naglar, hår, fransar, hudvård och liknande tjänster.
                                    </p>
                                    <p>
                                        Glowbook fungerar enbart som teknisk plattform och är inte arbetsgivare, salong eller behandlare. Alla behandlingar, priser och resultat ansvaras av respektive utförare.
                                    </p>
                                    <p>
                                        Genom att använda Glowbook accepterar du att bokningar sker direkt mellan kund och utförare.
                                    </p>
                                </>
                            )}
                        </SectionCard>

                        {/* 2: Account and Usage */}
                        <SectionCard id="konto-och-anvandning" title={sections[1].title} index={1}>
                            {isEn ? (
                                <>
                                    <p>A registered account is required to use Glowbook.</p>
                                    <p className="font-semibold text-foreground/70 dark:text-white/60">You are responsible for:</p>
                                    <BulletList
                                        items={[
                                            'Providing accurate and complete information',
                                            'Keeping your login credentials safe and secure',
                                            'Updating contact details whenever they change',
                                        ]}
                                    />
                                    <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">
                                        Glowbook reserves the right to suspend or restrict accounts in the event of:
                                    </p>
                                    <BulletList
                                        items={[
                                            'Misuse of the platform',
                                            'False or deceptive information',
                                            'Harassment, abusive behavior, or threats',
                                            'Attempted fraud or chargeback abuse',
                                            'Breach of these terms',
                                        ]}
                                    />
                                    <p className="pt-2">
                                        Users must be at least 16 years of age. For specific treatments, an 18-year age minimum may apply per provider policies.
                                    </p>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </SectionCard>

                        {/* 3: Bookings and Responsibility */}
                        <SectionCard id="bokningar-och-ansvar" title={sections[2].title} index={2}>
                            {isEn ? (
                                <>
                                    <p>All bookings take place directly between the customer and provider.</p>
                                    <p className="font-semibold text-foreground/70 dark:text-white/60">The provider is solely responsible for:</p>
                                    <BulletList
                                        items={[
                                            'Treatments and execution',
                                            'Hygiene and sanitation standards',
                                            'Certificates, licenses, and professional qualifications',
                                            'Transparent and accurate pricing',
                                            'Customer service and communication',
                                            'Results of the service',
                                        ]}
                                    />
                                    <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">Glowbook is not responsible for:</p>
                                    <BulletList
                                        items={[
                                            'Dissatisfaction with treatment outcomes',
                                            'Allergic reactions or adverse physical reactions',
                                            'Personal injury or property damage',
                                            'Cancelled or rescheduled appointments by the salon',
                                            'Financial disputes between customer and salon',
                                            'No-shows',
                                        ]}
                                    />
                                    <p className="pt-2">Any disputes must be resolved directly between customer and provider.</p>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </SectionCard>

                        {/* 4: Cancellation and No Show */}
                        <SectionCard id="avbokning-och-no-show" title={sections[3].title} index={3}>
                            {isEn ? (
                                <>
                                    <p>Each provider sets their own cancellation policy and notice window.</p>
                                    <p className="font-semibold text-foreground/70 dark:text-white/60">Customers are responsible for:</p>
                                    <BulletList
                                        items={[
                                            'Cancelling within the stated cancellation window',
                                            'Respecting provider policies and terms',
                                            'Paying any applicable late cancellation or no-show fees',
                                        ]}
                                    />
                                    <p className="pt-2">
                                        Glowbook is not responsible for fees charged by providers in accordance with their cancellation terms.
                                    </p>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </SectionCard>

                        {/* 5: Payments and Subscriptions */}
                        <SectionCard id="betalningar-och-abonnemang" title={sections[4].title} index={4}>
                            {isEn ? (
                                <>
                                    <p>Glowbook offers subscriptions and platform tools for providers.</p>
                                    <p className="font-semibold text-foreground/70 dark:text-white/60">All subscriptions:</p>
                                    <BulletList
                                        items={[
                                            'Billed monthly or annually as agreed',
                                            'Renew automatically unless cancelled',
                                            'May be cancelled at any time prior to the next billing period',
                                        ]}
                                    />
                                    <p className="pt-2">Commenced billing periods are non-refundable.</p>
                                    <p>
                                        In the event of failed payment, account features may be paused or restricted until settled.
                                    </p>
                                    <p>
                                        Glowbook utilizes certified third-party payment providers such as Stripe and Klarna. These providers ensure secure, PCI-compliant payment handling.
                                    </p>
                                    <p className="font-semibold text-champagne-700 dark:text-champagne-400">
                                        Glowbook never stores complete payment card details on our servers.
                                    </p>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </SectionCard>

                        {/* 6: Refunds */}
                        <SectionCard id="aterbetalningar" title={sections[5].title} index={5}>
                            {isEn ? (
                                <>
                                    <p>Glowbook does not process refunds for treatments directly.</p>
                                    <p>All refund requests between customer and salon are settled directly between both parties.</p>
                                    <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">Glowbook only processes refunds for:</p>
                                    <BulletList
                                        items={[
                                            'Technical errors in subscription billings',
                                            'Accidental duplicate platform charges',
                                            'Incorrect system-level platform fees',
                                        ]}
                                    />
                                    <p className="pt-2">Requests must be submitted via customer support.</p>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </SectionCard>

                        {/* 7: Provider Terms */}
                        <SectionCard id="utforarvillkor" title={sections[6].title} index={6}>
                            {isEn ? (
                                <>
                                    <p>Providers utilizing the Glowbook platform are strictly responsible for:</p>
                                    <BulletList
                                        items={[
                                            'Complying with applicable national laws and local salon regulations',
                                            'Taxes, business registration, and corporate duties',
                                            'Hygiene, sanitization, and customer safety',
                                            'Accurate pricing and service descriptions',
                                            'Accurate profile details and working hours',
                                            'Timely booking and appointment management',
                                            'Professional customer relations',
                                        ]}
                                    />
                                    <p className="pt-2">Glowbook is not an employer and holds no liability for provider business conduct.</p>
                                    <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">
                                        Glowbook reserves the right to remove providers who:
                                    </p>
                                    <BulletList
                                        items={[
                                            'Receive repeated unresolved complaints',
                                            'Violate relevant laws or health regulations',
                                            'Act unprofessionally or deceptively',
                                            'Abuse or compromise the platform',
                                        ]}
                                    />
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </SectionCard>

                        {/* 8: Community Guidelines */}
                        <SectionCard id="community-riktlinjer" title={sections[7].title} index={7}>
                            {isEn ? (
                                <>
                                    <p>Glowbook is committed to maintaining a safe, respectful, and professional community.</p>
                                    <p className="font-semibold text-foreground/70 dark:text-white/60">The following behaviors are strictly prohibited:</p>
                                    <BulletList
                                        items={[
                                            'Harassment, defamation, or threats',
                                            'Discrimination of any kind',
                                            'Spam, fraudulent, or fake bookings',
                                            'Fabricated reviews or rating manipulation',
                                            'Inappropriate or adult content',
                                            'Fraud and deceptive practices',
                                            'Attempts to circumvent Glowbook platform billing',
                                        ]}
                                    />
                                    <p className="pt-2 font-semibold text-red-500/80 dark:text-red-400/70">
                                        Violations may result in immediate and permanent account termination.
                                    </p>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </SectionCard>

                        {/* 9: Privacy Policy (GDPR) */}
                        <SectionCard id="integritetspolicy" title={sections[8].title} index={8}>
                            {isEn ? (
                                <>
                                    <p>Glowbook values your privacy and strictly adheres to the EU General Data Protection Regulation (GDPR).</p>
                                    <p>We only collect personal information required to deliver and optimize the service.</p>

                                    <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">
                                        Information collected may include:
                                    </p>
                                    <BulletList
                                        items={[
                                            'Full name',
                                            'Email address',
                                            'Phone number',
                                            'Booking history and treatment notes',
                                            'Account profile credentials',
                                            'Payment references tokenized by secure payment processors',
                                        ]}
                                    />

                                    <p className="font-semibold text-champagne-700 dark:text-champagne-400 pt-2">
                                        We never sell your personal information.
                                    </p>

                                    <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">Data is processed for:</p>
                                    <BulletList
                                        items={[
                                            'Facilitating bookings and appointments',
                                            'Processing payment authorizations',
                                            'Customer support and service notifications',
                                            'Platform security and fraud prevention',
                                            'Continuous platform improvements',
                                        ]}
                                    />

                                    <p className="pt-2">Data is stored within the EU/EEA or handled in accordance with GDPR compliance standards.</p>

                                    <p className="font-semibold text-foreground/70 dark:text-white/60 pt-2">You hold the right to:</p>
                                    <BulletList
                                        items={[
                                            'Request an extract of your personal data',
                                            'Request account and data erasure ("Right to be Forgotten")',
                                            'Correct outdated or inaccurate information',
                                        ]}
                                    />

                                    <div className="pt-4">
                                        <Link
                                            href="/support"
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-champagne-500/10 dark:bg-champagne-500/5 text-champagne-700 dark:text-champagne-400 font-bold text-sm hover:bg-champagne-500/20 transition-colors duration-300"
                                        >
                                            Contact Support <ChevronRight size={14} />
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </SectionCard>

                        {/* 10: Cookies */}
                        <SectionCard id="cookies" title={sections[9].title} index={9}>
                            {isEn ? (
                                <>
                                    <p>Glowbook uses cookies and local session data for:</p>
                                    <BulletList
                                        items={[
                                            'Authentication and active login state',
                                            'Core platform functionality and preferences (e.g. language & currency)',
                                            'Performance metrics and analytics',
                                            'Enhanced and seamless user experience',
                                        ]}
                                    />
                                    <p className="pt-2">By continuing to use the service, you consent to essential cookie usage.</p>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </SectionCard>

                        {/* 11: Limitation of Liability */}
                        <SectionCard id="ansvarsbegransning" title={sections[10].title} index={10}>
                            {isEn ? (
                                <>
                                    <p>Glowbook provides the platform on an "as is" and "as available" basis.</p>
                                    <p className="font-semibold text-foreground/70 dark:text-white/60">Glowbook is not liable for:</p>
                                    <BulletList
                                        items={[
                                            'Indirect, incidental, or consequential damages',
                                            'Lost profits, lost revenues, or loss of clients',
                                            'Technical interruptions or third-party outages',
                                            'Results, quality, or conduct of salon treatments',
                                        ]}
                                    />
                                    <p className="pt-2">
                                        Glowbook strives for high platform availability but does not guarantee uninterrupted service.
                                    </p>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </SectionCard>

                        {/* 12: Amendments to Terms */}
                        <SectionCard id="andringar-av-villkor" title={sections[11].title} index={11}>
                            {isEn ? (
                                <>
                                    <p>Glowbook reserves the right to amend these terms at any time.</p>
                                    <p>
                                        Continued use of the platform following updates represents full acceptance of the revised terms.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p>Glowbook kan när som helst uppdatera dessa villkor.</p>
                                    <p>
                                        Fortsatt användning av tjänsten innebär godkännande av uppdaterade villkor.
                                    </p>
                                </>
                            )}
                        </SectionCard>

                        {/* 13: Contact */}
                        <SectionCard id="kontakt" title={sections[12].title} index={12}>
                            {isEn ? (
                                <>
                                    <p>
                                        Have questions regarding our terms or privacy policy? Reach out directly via our support desk.
                                    </p>
                                    <p><strong className="text-foreground/70 dark:text-white/60">Company:</strong> Glowbook</p>
                                    <div className="pt-4">
                                        <Link
                                            href="/support"
                                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-foreground dark:bg-white text-background dark:text-black rounded-full font-bold text-sm hover:bg-champagne-600 hover:text-white transition-all duration-300 shadow-lg active:scale-95"
                                        >
                                            Contact Support <ChevronRight size={14} />
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
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
                                {isEn
                                    ? 'This document applies to all users and service providers operating on the Glowbook platform.'
                                    : 'Detta dokument gäller för alla användare och utförare som använder Glowbook-plattformen.'}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
