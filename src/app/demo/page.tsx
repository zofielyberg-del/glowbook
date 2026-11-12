'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calendar, Heart, Shield, Check, ArrowRight, Play, RotateCcw, ChevronRight, Star, Clock, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function GlowbookMotionDemo() {
    const [scene, setScene] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [cursorPos, setCursorPos] = useState({ x: 300, y: 500 });
    const [isClicking, setIsClicking] = useState(false);
    const [activeModal, setActiveModal] = useState<string | null>(null);

    // Auto-advance timeline matching Pinterest 2.5D demo style
    useEffect(() => {
        if (!isPlaying) return;

        const timeline = [
            // Scene 0: Hook / Intro with Typewriter (0 - 4s)
            { time: 500, action: () => { setScene(0); setActiveModal(null); setCursorPos({ x: 450, y: 380 }); } },
            
            // Scene 1: Floating macOS Window with Split View & Cursor Click (4s - 10s)
            { time: 4200, action: () => { setScene(1); setActiveModal(null); setCursorPos({ x: 280, y: 460 }); } },
            { time: 6200, action: () => { setCursorPos({ x: 620, y: 380 }); } },
            { time: 7000, action: () => { setIsClicking(true); setActiveModal('booking'); } },
            { time: 7400, action: () => { setIsClicking(false); } },
            
            // Scene 2: Deep Dive into Calendar & Smart Onboarding (10s - 17s)
            { time: 10500, action: () => { setScene(2); setActiveModal(null); setCursorPos({ x: 500, y: 320 }); } },
            { time: 13000, action: () => { setCursorPos({ x: 780, y: 420 }); setIsClicking(true); } },
            { time: 13400, action: () => { setIsClicking(false); setActiveModal('loyal'); } },

            // Scene 3: Product Partner & Cross-Selling Showcase (17s - 24s)
            { time: 17500, action: () => { setScene(3); setActiveModal(null); setCursorPos({ x: 340, y: 480 }); } },
            { time: 20000, action: () => { setCursorPos({ x: 680, y: 520 }); setIsClicking(true); } },
            { time: 20400, action: () => { setIsClicking(false); setActiveModal('product'); } },

            // Scene 4: Outro / Grand Finale (24s - 30s)
            { time: 24500, action: () => { setScene(4); setActiveModal(null); setCursorPos({ x: 540, y: 600 }); } },
            
            // Loop restart at 30s
            { time: 30000, action: () => { setScene(0); setActiveModal(null); } }
        ];

        const timeouts = timeline.map(step => setTimeout(step.action, step.time));
        return () => timeouts.forEach(clearTimeout);
    }, [isPlaying, scene === 4]);

    return (
        <div className="relative w-full min-h-screen bg-[#FAF8F5] text-[#141416] overflow-hidden select-none font-sans flex flex-col justify-between p-6 md:p-12">
            
            {/* Ambient luxury mesh gradient background in Glowbook signature champagne colors */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[#F5E2C1]/40 via-[#C2A26A]/20 to-transparent blur-[120px]" />
                <div className="absolute top-[40%] -right-[15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-bl from-[#FCD5DF]/35 via-[#EAE8E2]/50 to-transparent blur-[140px]" />
                <div className="absolute -bottom-[20%] left-[20%] w-[70vw] h-[50vw] rounded-full bg-gradient-to-t from-[#C2A26A]/15 via-transparent to-transparent blur-[130px]" />
            </div>

            {/* Top Navigation Bar */}
            <header className="relative z-30 flex items-center justify-between max-w-6xl w-full mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C2A26A] to-[#856C3D] flex items-center justify-center text-white shadow-lg shadow-[#C2A26A]/30">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <span className="font-extrabold text-xl tracking-tight text-[#141416]">GLOWBOOK</span>
                        <span className="hidden sm:inline-block ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#C2A26A]/15 text-[#856C3D] border border-[#C2A26A]/30">
                            Studio & Partners
                        </span>
                    </div>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center gap-2">
                    {[0, 1, 2, 3, 4].map(idx => (
                        <button
                            key={idx}
                            onClick={() => setScene(idx)}
                            className={`h-2 rounded-full transition-all duration-500 ${
                                scene === idx 
                                    ? 'w-8 bg-[#C2A26A]' 
                                    : 'w-2 bg-[#141416]/15 hover:bg-[#141416]/30'
                            }`}
                        />
                    ))}
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="ml-4 p-2 rounded-xl bg-white/80 border border-[#141416]/10 hover:bg-white text-[#141416] transition-all shadow-sm"
                        title={isPlaying ? 'Pausa' : 'Spela'}
                    >
                        {isPlaying ? <span className="text-xs font-bold px-1">❚❚</span> : <Play size={12} />}
                    </button>
                </div>
            </header>

            {/* Main Stage: 2.5D Animated Showcase */}
            <main className="relative z-20 max-w-6xl w-full mx-auto my-auto py-6 flex items-center justify-center">
                <AnimatePresence mode="wait">

                    {/* SCENE 0: HOOK / TYPEWRITER INTRO */}
                    {scene === 0 && (
                        <motion.div
                            key="scene-0"
                            initial={{ opacity: 0, y: 30, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.97 }}
                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                            className="text-center max-w-3xl space-y-8"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-[#C2A26A]/30 shadow-md">
                                <Sparkles size={16} className="text-[#C2A26A]" />
                                <span className="text-xs font-black uppercase tracking-widest text-[#856C3D]">
                                    Den nya standarden för skönhet
                                </span>
                            </div>

                            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#141416] leading-[1.08]">
                                Från Instagram-DM till <br />
                                <span className="bg-gradient-to-r from-[#C2A26A] via-[#A38652] to-[#856C3D] bg-clip-text text-transparent">
                                    fullbokad salong.
                                </span>
                            </h1>

                            <p className="text-lg sm:text-xl text-[#141416]/60 max-w-xl mx-auto font-medium">
                                Ett skräddarsytt boknings- och lojalitetssystem för nagelstudios och produktvarumärken.
                            </p>

                            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                                <div className="px-5 py-3 rounded-2xl bg-white shadow-xl shadow-black/5 border border-black/5 text-sm font-bold flex items-center gap-2">
                                    <Check size={18} className="text-emerald-500" />
                                    <span>20 sekunders mobilbokning</span>
                                </div>
                                <div className="px-5 py-3 rounded-2xl bg-white shadow-xl shadow-black/5 border border-black/5 text-sm font-bold flex items-center gap-2">
                                    <Check size={18} className="text-emerald-500" />
                                    <span>Glowpoints & Stämpelkort</span>
                                </div>
                                <div className="px-5 py-3 rounded-2xl bg-white shadow-xl shadow-black/5 border border-black/5 text-sm font-bold flex items-center gap-2">
                                    <Check size={18} className="text-emerald-500" />
                                    <span>Produkter direkt vid kassan</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* SCENE 1: FLOATING MACOS WINDOW (BOOKING FLOW) */}
                    {scene === 1 && (
                        <motion.div
                            key="scene-1"
                            initial={{ opacity: 0, rotateX: 10, y: 40 }}
                            animate={{ opacity: 1, rotateX: 0, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                        >
                            {/* Left Text Pitch */}
                            <div className="lg:col-span-5 space-y-4">
                                <span className="text-xs font-black uppercase tracking-widest text-[#C2A26A]">
                                    01 • Kundupplevelsen
                                </span>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#141416] tracking-tight leading-tight">
                                    Dina kunder bokar <br />
                                    <span className="text-[#A38652]">utan friktion.</span>
                                </h2>
                                <p className="text-sm text-[#141416]/65 leading-relaxed">
                                    Inga krångliga appar som måste laddas ner eller långa registreringar. Kunden klickar på din länk i din Instagram-bio och är bokad på under 20 sekunder.
                                </p>
                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#141416]/80">
                                        <div className="w-5 h-5 rounded-full bg-[#C2A26A]/20 flex items-center justify-center text-[#856C3D]">✓</div>
                                        <span>Automatiska SMS-påminnelser (noll no-shows)</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#141416]/80">
                                        <div className="w-5 h-5 rounded-full bg-[#C2A26A]/20 flex items-center justify-center text-[#856C3D]">✓</div>
                                        <span>Kort, Swish och Klarna integrerat via Stripe</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Floating macOS Window */}
                            <div className="lg:col-span-7 relative">
                                <motion.div 
                                    className="bg-white/95 backdrop-blur-xl rounded-[28px] border border-black/[0.08] shadow-[0_30px_90px_rgba(194,162,106,0.22)] overflow-hidden"
                                    animate={{ y: [0, -6, 0] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    {/* Window Header */}
                                    <div className="px-5 py-3.5 bg-[#FAF8F5] border-b border-black/[0.06] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                                            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                                            <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                                        </div>
                                        <div className="px-4 py-1 rounded-full bg-black/5 text-[11px] font-bold text-[#141416]/60">
                                            glowbook.se/salon/studio-glow
                                        </div>
                                        <div className="w-12" />
                                    </div>

                                    {/* Window Body: Clean Treatment list */}
                                    <div className="p-6 space-y-3">
                                        <div className="flex items-center justify-between pb-3 border-b border-black/5">
                                            <div>
                                                <h3 className="font-extrabold text-base text-[#141416]">Studio Glow • Naglar</h3>
                                                <p className="text-[11px] text-[#141416]/50">Stockholm • 4.9 ★★★★★ (124 recensioner)</p>
                                            </div>
                                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-bold">
                                                Öppet för bokning
                                            </span>
                                        </div>

                                        {/* Service 1 */}
                                        <div className="p-4 rounded-2xl border border-black/5 bg-[#FAF8F5] hover:border-[#C2A26A]/50 transition-all flex items-center justify-between group">
                                            <div>
                                                <div className="font-bold text-sm text-[#141416]">Nytt Set Gelénaglar + Design</div>
                                                <div className="text-xs text-[#141416]/50">90 min • Inkl. nagelbandsvård & valfri form</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-extrabold text-sm text-[#141416]">850 kr</div>
                                                <button className="mt-1 px-3 py-1 bg-[#C2A26A] text-white rounded-xl text-xs font-bold group-hover:scale-105 transition-transform">
                                                    Välj tid
                                                </button>
                                            </div>
                                        </div>

                                        {/* Service 2 (Selected by cursor) */}
                                        <motion.div 
                                            className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                                                activeModal === 'booking' 
                                                    ? 'border-[#C2A26A] bg-[#F5E2C1]/20 shadow-md ring-2 ring-[#C2A26A]/30' 
                                                    : 'border-black/5 bg-[#FAF8F5]'
                                            }`}
                                        >
                                            <div>
                                                <div className="font-bold text-sm text-[#141416]">Återbesök Gelénaglar</div>
                                                <div className="text-xs text-[#141416]/50">60 min • Påfyllning och färgbyte</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-extrabold text-sm text-[#141416]">650 kr</div>
                                                <button className="mt-1 px-3 py-1 bg-[#141416] text-white rounded-xl text-xs font-bold">
                                                    Välj tid
                                                </button>
                                            </div>
                                        </motion.div>
                                    </div>
                                </motion.div>

                                {/* Popping Modal on Click */}
                                <AnimatePresence>
                                    {activeModal === 'booking' && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="absolute -bottom-8 -right-4 sm:right-6 bg-white p-5 rounded-3xl border border-[#C2A26A]/40 shadow-2xl z-30 max-w-xs space-y-3"
                                        >
                                            <div className="flex items-center gap-2 text-xs font-black uppercase text-[#C2A26A]">
                                                <Sparkles size={14} />
                                                <span>Snabbokning bekräftad</span>
                                            </div>
                                            <div className="text-sm font-bold text-[#141416]">
                                                Fredag kl 14:00 • Emma K.
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-800">
                                                SMS-bekräftelse och kalenderbokning skickad direkt till kunden!
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}

                    {/* SCENE 2: SALON OWNER DASHBOARD & LOYALTY */}
                    {scene === 2 && (
                        <motion.div
                            key="scene-2"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                        >
                            <div className="lg:col-span-5 space-y-4">
                                <span className="text-xs font-black uppercase tracking-widest text-[#C2A26A]">
                                    02 • För Salongsägaren
                                </span>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#141416] tracking-tight leading-tight">
                                    Full kontroll över <br />
                                    <span className="text-[#C2A26A]">dina stamkunder.</span>
                                </h2>
                                <p className="text-sm text-[#141416]/65 leading-relaxed">
                                    Inga papperskort som kunderna tappar bort. Glowbook sköter digitala stämpelkort och lojalitetspoäng helt automatiskt så dina kunder kommer tillbaka var 3:e vecka.
                                </p>
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="p-3 bg-white rounded-2xl border border-black/5 shadow-sm text-center">
                                        <div className="text-2xl font-black text-[#141416]">+38%</div>
                                        <div className="text-[10px] text-[#141416]/50 uppercase font-bold">Återbokningsgrad</div>
                                    </div>
                                    <div className="p-3 bg-white rounded-2xl border border-black/5 shadow-sm text-center">
                                        <div className="text-2xl font-black text-emerald-600">0 kr</div>
                                        <div className="text-[10px] text-[#141416]/50 uppercase font-bold">I startavgift</div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Bento Cards */}
                            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Digital Stämpelkort Card */}
                                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider text-[#C2A26A]">Digitalt Stämpelkort</span>
                                        <Star size={16} className="text-[#C2A26A]" fill="#C2A26A" />
                                    </div>
                                    <div className="text-lg font-extrabold text-[#141416]">5:e besöket ger 20% rabatt</div>
                                    <div className="grid grid-cols-5 gap-2 pt-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div 
                                                key={i} 
                                                className={`h-12 rounded-xl flex items-center justify-center font-black text-sm ${
                                                    i <= 4 
                                                        ? 'bg-gradient-to-br from-[#C2A26A] to-[#856C3D] text-white shadow-md' 
                                                        : 'bg-black/5 text-[#141416]/30 border border-dashed border-black/20'
                                                }`}
                                            >
                                                {i <= 4 ? '✓' : '5'}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-[#141416]/50">Kunden har 1 stämpel kvar till belöning.</p>
                                </div>

                                {/* Smart Kalender Card */}
                                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider text-[#856C3D]">Mobil Kalender</span>
                                        <Clock size={16} className="text-[#856C3D]" />
                                    </div>
                                    <div className="text-lg font-extrabold text-[#141416]">Morgondagens Schema</div>
                                    <div className="space-y-2 text-xs">
                                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-bold text-emerald-800 flex justify-between">
                                            <span>10:00 • Nytt Set</span>
                                            <span>850 kr</span>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-[#C2A26A]/10 border border-[#C2A26A]/20 font-bold text-[#856C3D] flex justify-between">
                                            <span>13:30 • Påfyllning</span>
                                            <span>650 kr</span>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-black/5 font-medium text-[#141416]/50 flex justify-between">
                                            <span>15:30 • Ledig tid</span>
                                            <span className="text-emerald-600 font-bold">Öppen</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* SCENE 3: PRODUCT PARTNER CROSS-SELLING */}
                    {scene === 3 && (
                        <motion.div
                            key="scene-3"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                        >
                            <div className="lg:col-span-5 space-y-4">
                                <span className="text-xs font-black uppercase tracking-widest text-[#C2A26A]">
                                    03 • För Produktpartnern
                                </span>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#141416] tracking-tight leading-tight">
                                    Sälj produkter direkt <br />
                                    <span className="text-[#C2A26A]">vid behandlingen.</span>
                                </h2>
                                <p className="text-sm text-[#141416]/65 leading-relaxed">
                                    När kunden sitter vid nagelbordet eller bokar sitt återbesök rekommenderas rätt nagelolja, nagelbandskräm och eftervård automatiskt.
                                </p>
                                <div className="space-y-2 pt-2 text-xs font-bold text-[#141416]/80">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-[#C2A26A]/20 flex items-center justify-center text-[#856C3D]">✦</div>
                                        <span>Högre snittkvitto för salongen</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-[#C2A26A]/20 flex items-center justify-center text-[#856C3D]">✦</div>
                                        <span>Direkt distribution till anslutna terapeuter</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Product Addon Mockup */}
                            <div className="lg:col-span-7">
                                <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-2xl space-y-5">
                                    <div className="flex items-center justify-between pb-3 border-b border-black/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#C2A26A] flex items-center justify-center">
                                                <ShoppingBag size={24} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black uppercase text-[#C2A26A]">Rekommenderad eftervård</div>
                                                <div className="font-extrabold text-base text-[#141416]">Köp med hem vid besöket</div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                                            + 199 kr
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#FAF8F5] border border-black/5">
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#F5E2C1] to-[#C2A26A] flex items-center justify-center text-white font-black text-xl shadow-md">
                                            💅
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-sm text-[#141416]">Ekologisk Nagelolja 30ml</div>
                                            <div className="text-xs text-[#141416]/50">Förlänger hållbarheten på gelenaglarna upp till 4 veckor</div>
                                        </div>
                                        <button className="px-4 py-2 bg-[#141416] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#C2A26A] transition-colors">
                                            Lägg till
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* SCENE 4: GRAND FINALE / CALL TO ACTION */}
                    {scene === 4 && (
                        <motion.div
                            key="scene-4"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="text-center max-w-3xl space-y-8"
                        >
                            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#C2A26A] via-[#A38652] to-[#856C3D] flex items-center justify-center text-white shadow-2xl shadow-[#C2A26A]/40">
                                <Sparkles size={40} />
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-4xl sm:text-5xl font-extrabold text-[#141416] tracking-tight">
                                    Redo att ta er verksamhet till <br />
                                    <span className="bg-gradient-to-r from-[#C2A26A] via-[#A38652] to-[#856C3D] bg-clip-text text-transparent">
                                        nästa nivå?
                                    </span>
                                </h2>
                                <p className="text-base sm:text-lg text-[#141416]/60 max-w-lg mx-auto font-medium">
                                    Vi sätter upp er profil på under 3 minuter helt utan startavgifter.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                <Link
                                    href="/onboarding/provider"
                                    className="px-8 py-4 rounded-2xl bg-[#141416] text-white font-black text-sm uppercase tracking-widest hover:bg-[#C2A26A] transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
                                >
                                    <span>Kom igång nu</span>
                                    <ArrowRight size={16} />
                                </Link>
                                <button
                                    onClick={() => setScene(0)}
                                    className="px-6 py-4 rounded-2xl bg-white border border-black/10 text-[#141416] font-bold text-sm hover:bg-black/5 transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <RotateCcw size={16} />
                                    <span>Se om presentationen</span>
                                </button>
                            </div>

                            <div className="pt-4 text-xs font-bold text-[#141416]/40 uppercase tracking-widest">
                                www.glowbook.se • support@glowbook.se
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>

                {/* Animated 2.5D Pointer Cursor (Axiom Pinterest Style) */}
                <motion.div
                    className="fixed pointer-events-none z-50 text-white drop-shadow-xl"
                    animate={{
                        x: cursorPos.x,
                        y: cursorPos.y,
                        scale: isClicking ? 0.8 : 1
                    }}
                    transition={{
                        type: "spring",
                        damping: 24,
                        stiffness: 180,
                        mass: 0.6
                    }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill="#141416" stroke="white" strokeWidth="1.5" />
                    </svg>
                </motion.div>
            </main>

            {/* Bottom Footer Control Bar */}
            <footer className="relative z-30 max-w-6xl w-full mx-auto flex items-center justify-between text-xs text-[#141416]/50 font-bold border-t border-black/5 pt-4">
                <div>Glowbook Sweden • Exclusive Partner Showcase</div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setScene(Math.max(0, scene - 1))} className="hover:text-[#141416]">← Föregående</button>
                    <span>{scene + 1} / 5</span>
                    <button onClick={() => setScene(Math.min(4, scene + 1))} className="hover:text-[#141416]">Nästa →</button>
                </div>
            </footer>
        </div>
    );
}
