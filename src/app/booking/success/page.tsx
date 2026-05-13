
'use client';

import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { motion } from 'framer-motion';
import { CheckCircle2, Calendar, MapPin, Share2, ArrowRight, Star, Sparkles, Heart } from 'lucide-react';
import Link from 'next/link';

import { Suspense } from 'react';

function BookingSuccessContent() {
    const searchParams = useSearchParams();
    const salonName = searchParams.get('salon') || 'Salongen';
    const serviceName = searchParams.get('service') || 'Behandling';
    const date = 'Måndag, 15 Feb';
    const time = '10:15';

    return (
        <div className="min-h-screen bg-background font-body">
            <Header />

            <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-12"
                >
                    {/* Success Icon */}
                    <div className="relative inline-block">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 12, delay: 0.2 }}
                            className="w-32 h-32 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center border border-green-500/20"
                        >
                            <CheckCircle2 size={64} />
                        </motion.div>
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0, 1, 0]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-green-500/20 rounded-full"
                        />
                        <div className="absolute -top-4 -right-4 text-champagne-500 animate-pulse">
                            <Sparkles size={24} />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-heading font-black text-foreground tracking-tight">
                            Bokningen är <span className="text-champagne-600">bekräftad!</span>
                        </h1>
                        <p className="text-foreground/40 text-lg max-w-md mx-auto leading-relaxed">
                            Vi har skickat en bekräftelse till din e-post. Du kan nu luta dig tillbaka och se fram emot din glow up hos <span className="text-foreground/80 font-bold">{salonName}</span>.
                        </p>
                    </div>

                    {/* Ticket Design */}
                    <div className="bg-card rounded-[40px] border border-border shadow-2xl overflow-hidden max-w-lg mx-auto relative group">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-champagne-400 via-pink-300 to-champagne-400" />

                        <div className="p-10 space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="text-left space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Behandling</p>
                                    <p className="text-xl font-bold text-foreground">{serviceName}</p>
                                </div>
                                <div className="text-right">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-champagne-100 dark:bg-champagne-900/30 text-champagne-700 dark:text-champagne-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        Premium
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 py-8 border-y border-border/50 border-dashed">
                                <div className="text-left space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Datum & Tid</p>
                                    <div className="flex items-center gap-2 text-foreground font-bold">
                                        <Calendar size={14} className="text-champagne-500" />
                                        <span>{date} kl {time}</span>
                                    </div>
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Plats</p>
                                    <div className="flex items-center gap-2 text-foreground font-bold">
                                        <MapPin size={14} className="text-champagne-500" />
                                        <span>{salonName}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-mono text-foreground/20 tracking-tighter uppercase">
                                <span>GB-REF-{Math.floor(Math.random() * 900000 + 100000)}</span>
                                <span>Confirmed via Glowbook</span>
                            </div>
                        </div>

                        {/* Side Cutouts (Ticket Look) */}
                        <div className="absolute top-1/2 -left-4 w-8 h-8 bg-background border border-border rounded-full" />
                        <div className="absolute top-1/2 -right-4 w-8 h-8 bg-background border border-border rounded-full" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                        <button className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-foreground text-background rounded-full font-bold text-sm tracking-wide transition-all hover:bg-champagne-600 hover:text-white shadow-xl">
                            Lägg till i kalender <Calendar size={16} />
                        </button>
                        <Link
                            href="/profile"
                            className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-card text-foreground border border-border rounded-full font-bold text-sm tracking-wide transition-all hover:border-foreground/20 shadow-sm"
                        >
                            Mina bokningar <ArrowRight size={16} />
                        </Link>
                    </div>

                    {/* Reward Teaser */}
                    <div className="max-w-md mx-auto pt-16">
                        <div className="bg-gradient-to-br from-[#111] to-[#000] p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                                <Heart size={100} fill="currentColor" />
                            </div>
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-2 text-champagne-400 font-black text-[10px] uppercase tracking-[0.2em]">
                                    <Star size={12} fill="currentColor" /> Lojalitetsprogram
                                </div>
                                <h3 className="text-xl font-bold">Denna bokning gav dig <span className="text-champagne-400">150 poäng!</span></h3>
                                <p className="text-white/40 text-xs leading-relaxed">
                                    Du är nu bara 450 poäng ifrån en gratis behandling hos {salonName}. Fortsätt samla för fler förmåner!
                                </p>
                                <Link href="/rewards" className="inline-flex items-center gap-2 text-champagne-400 text-xs font-bold hover:gap-3 transition-all pt-2">
                                    Se dina rewards <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}

export default function BookingSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
            <BookingSuccessContent />
        </Suspense>
    );
}
