'use client';

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Gift, Gem, Star, ArrowRight, Trophy, Check, Sparkles, ShoppingBag, Store, Calendar as CalendarIcon } from "lucide-react";
import { MEMBER_LEVELS } from "@/lib/loyalty";
import clsx from "clsx";
import { useLanguage } from "@/context/LanguageContext";

export default function RewardsInfoPage() {
    const { t } = useLanguage();
    // Glowpoints are personal - only show stats when properly authenticated
    // For now, always show the informational/promotional view
    const isLoggedIn = false;
    const points = 0;

    const currentLevel = MEMBER_LEVELS.find(l => points >= l.threshold) || MEMBER_LEVELS[0];
    const nextLevel = MEMBER_LEVELS.find(l => l.threshold > points);
    const progress = nextLevel ? (points / nextLevel.threshold) * 100 : 100;

    const steps = [
        {
            step: '1',
            icon: ShoppingBag,
            title: t('rewards_step1_title'),
            desc: t('rewards_step1_desc'),
        },
        {
            step: '2',
            icon: Star,
            title: t('rewards_step2_title'),
            desc: t('rewards_step2_desc'),
        },
        {
            step: '3',
            icon: Store,
            title: t('rewards_step3_title'),
            desc: t('rewards_step3_desc'),
        },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-body transition-colors duration-500">
            <Header />

            <main className="pt-28 pb-24 gpu">
                {/* Hero / My Status */}
                <section className="px-6 mb-16">
                    <div className="max-w-4xl mx-auto">
                        <AnimatePresence mode="wait">
                            {isLoggedIn ? (
                                <motion.div
                                    key="logged-in"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/10"
                                >
                                    <div className="absolute top-0 right-0 p-10 opacity-10">
                                        <Trophy size={160} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                            <div className="space-y-4">
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-champagne-500/20 border border-champagne-500/30 rounded-full text-champagne-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                                                    {currentLevel.label} Medlem
                                                </div>
                                                <h1 className="text-3xl font-heading font-bold text-white">
                                                    Välkommen tillbaka!
                                                </h1>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-5xl font-black text-champagne-500">{points}</span>
                                                    <span className="text-lg font-bold text-white/40 mb-1.5 uppercase tracking-widest text-xs">Poäng totalt</span>
                                                </div>
                                            </div>

                                            <div className="w-full md:w-64 space-y-3">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                                                    <span>Status Progress</span>
                                                    <span>{nextLevel?.label || 'Max Level'}</span>
                                                </div>
                                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 1.5, ease: "circOut" }}
                                                        className="h-full bg-gradient-to-r from-champagne-600 to-champagne-400"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-white/30 text-right">
                                                    {nextLevel ? `${nextLevel.threshold - points} poäng kvar till ${nextLevel.label}` : 'Du har nått högsta nivån!'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
                                            {[
                                                { label: 'Bokningar', value: '14', icon: CalendarIcon },
                                                { label: 'Rewards', value: '3', icon: Gift },
                                                { label: 'Besparat', value: '850 kr', icon: Gem },
                                                { label: 'Ranking', value: '#12', icon: Trophy },
                                            ].map((stat, i) => (
                                                <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-champagne-500/10 flex items-center justify-center text-champagne-400">
                                                        <stat.icon size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{stat.label}</p>
                                                        <p className="text-sm font-bold text-white">{stat.value}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="logged-out"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center space-y-4"
                                >
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-champagne-500/10 border border-champagne-500/20 rounded-full text-champagne-600 text-[10px] font-bold uppercase tracking-[0.2em]">
                                        <Star size={12} className="fill-champagne-500" /> {t('rewards_badge')}
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-foreground">
                                        Glowbook <span className="text-champagne-600">{t('rewards_title')}</span>
                                    </h1>
                                    <p className="text-foreground/60 dark:text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
                                        {t('rewards_subtitle')}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* How it works */}
                <section className="px-6 mb-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-10">
                            <h2 className="text-2xl font-heading font-bold text-foreground">{t('rewards_how_it_works_title')}</h2>
                            <p className="text-foreground/40 dark:text-white/40 text-sm mt-2">{t('rewards_how_it_works_sub')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {steps.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.12 }}
                                    className="bg-card dark:bg-[#141414] rounded-3xl p-8 border border-black/5 dark:border-white/5 text-center space-y-4 shadow-sm hover:shadow-lg transition-all group"
                                >
                                    <div className="w-14 h-14 mx-auto rounded-2xl bg-champagne-500/10 dark:bg-champagne-500/5 flex items-center justify-center text-champagne-600 group-hover:scale-110 transition-transform duration-500">
                                        <item.icon size={24} />
                                    </div>
                                    <h3 className="font-heading font-bold text-lg text-foreground">{item.title}</h3>
                                    <p className="text-sm text-foreground/50 dark:text-white/40 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Important note */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="mt-8 bg-champagne-500/5 dark:bg-champagne-500/[0.03] border border-champagne-500/10 rounded-2xl p-6 text-center"
                        >
                            <p className="text-sm text-foreground/60 dark:text-white/50 font-medium leading-relaxed">
                                <span className="font-bold text-champagne-700 dark:text-champagne-400">{t('rewards_note_prefix')}</span> {t('rewards_note_body')}
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Member Levels */}
                <section className="px-6 mb-24">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="text-center max-w-2xl mx-auto space-y-2">
                            <h2 className="text-2xl font-heading font-bold text-foreground">{t('rewards_levels_title')}</h2>
                            <p className="text-foreground/45 dark:text-white/45 text-sm">{t('rewards_levels_desc')}</p>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {MEMBER_LEVELS.map((level, i) => (
                                <motion.div
                                    key={level.key}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className={clsx(
                                        "bg-card dark:bg-[#141414] rounded-3xl p-6 border shadow-sm text-center group hover:shadow-xl transition-all relative overflow-hidden",
                                        points >= level.threshold ? "border-champagne-500/50" : "border-black/5 dark:border-white/5"
                                    )}
                                >
                                    {points >= level.threshold && (
                                        <div className="absolute top-2 right-2">
                                            <div className="bg-champagne-500 text-white rounded-full p-1">
                                                <Check size={10} strokeWidth={4} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-4xl mb-3">{level.badgeEmoji}</div>
                                    <h3 className="font-bold font-heading text-lg mb-1" style={{ color: level.color }}>{level.label}</h3>
                                    <p className="text-[10px] text-foreground/40 dark:text-white/40 uppercase tracking-widest font-black mb-3">{level.threshold}+ {t('rewards_points_suffix')}</p>
                                    <div className="space-y-1.5">
                                        {level.perks.map((perk, j) => (
                                            <p key={j} className="text-[10px] text-foreground/60 dark:text-white/50 flex items-start gap-1.5 text-left font-medium">
                                                <Check size={10} className="mt-0.5 shrink-0 text-champagne-500" /> {t(`rewards_perk_${level.key}_${j + 1}`) || perk}
                                            </p>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>



                {/* Bottom CTA */}
                {!isLoggedIn && (
                    <section className="px-6">
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-[3rem] p-16 text-center text-white relative overflow-hidden border border-white/5 shadow-2xl">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-champagne-500/10 rounded-full blur-3xl gpu" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-champagne-500/5 rounded-full blur-3xl gpu" />
                                <div className="relative z-10 space-y-6">
                                    <Sparkles size={40} className="text-champagne-400 mx-auto" />
                                    <h2 className="text-3xl md:text-4xl font-heading font-bold flex flex-col gap-2">
                                        <span>{t('rewards_cta_title')}</span>
                                        <span className="text-champagne-500 text-lg md:text-xl font-medium tracking-[0.3em] uppercase">Glowbook Rewards</span>
                                    </h2>
                                    <p className="text-white/60 max-w-sm mx-auto leading-relaxed">
                                        {t('rewards_cta_desc')}
                                    </p>
                                    <div className="pt-4">
                                        <Link
                                            href="/auth/register"
                                            className="inline-flex items-center gap-3 px-10 py-4 bg-white text-black rounded-full font-bold hover:bg-champagne-600 hover:text-white hover:scale-105 transition-all shadow-xl active:scale-[0.98]"
                                        >
                                            {t('rewards_cta_btn')} <ArrowRight size={18} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <Footer />
        </div>
    );
}
