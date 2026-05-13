'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, CreditCard, Send, CheckCircle2, Star, Sparkles, Heart, Mail, Copy, Check, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';

const VALUES = [500, 1000, 2000, 3000];

// Generate a unique gift card code like GLOW-A3K9-M7X2
// BULLSEYE: Core Gift Card Generation Logic
function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion
    const seg1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const seg2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `GLOW-${seg1}-${seg2}`;
}

export type GiftCard = {
    id: string;
    code: string;
    value: number;
    currency: string;
    remainingBalance: number;
    recipientName: string;
    recipientEmail: string;
    senderName: string;
    message: string;
    purchasedAt: string;
    expiresAt: string;
    status: 'active' | 'used' | 'expired';
    usageHistory: { date: string; amount: number; provider: string }[];
};

export default function GiftCardsPage() {
    const { t, currency } = useLanguage();
    const [selectedValue, setSelectedValue] = useState<number>(1000);
    const [recipient, setRecipient] = useState({ to: '', from: '', email: '', message: '' });
    const [isPurchased, setIsPurchased] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [activeView, setActiveView] = useState<'buy' | 'redeem'>('buy');
    const [redeemCode, setRedeemCode] = useState('');
    const [redeemResult, setRedeemResult] = useState<{ success: boolean; message: string; card?: GiftCard } | null>(null);

    // BULLSEYE: Gift Card Purchase Processor
    const handlePurchase = async () => {
        if (!recipient.email || !recipient.email.includes('@')) {
            alert('Vänligen fyll i en giltig e-postadress.');
            return;
        }
        if (!recipient.to.trim()) {
            alert('Vänligen fyll i mottagarens namn.');
            return;
        }

        try {
            const response = await fetch('/api/giftcards/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: selectedValue,
                    recipient,
                    currency
                }),
            });

            const data = await response.json();
            if (data.url) {
                // Redirect to Stripe Checkout
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }
        } catch (error) {
            console.error('Purchase Error:', error);
            alert('Ett fel uppstod vid betalningen. Försök igen senare.');
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRedeem = async () => {
        const cleanCode = redeemCode.trim().toUpperCase();
        if (!cleanCode) {
            setRedeemResult({ success: false, message: 'Ange en kod.' });
            return;
        }

        try {
            const response = await fetch('/api/giftcards/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: cleanCode }),
            });

            const data = await response.json();

            if (data.success) {
                setRedeemResult({
                    success: true,
                    message: `Presentkort giltigt! Saldo: ${data.card.remainingBalance} SEK`,
                    card: data.card,
                });
            } else {
                setRedeemResult({
                    success: false,
                    message: data.error || 'Presentkortet kunde inte verifieras.'
                });
            }
        } catch (error) {
            console.error('Redemption error:', error);
            setRedeemResult({ success: false, message: 'Ett tekniskt fel uppstod. Försök igen senare.' });
        }
    };

    const handleReset = () => {
        setIsPurchased(false);
        setGeneratedCode('');
        setRecipient({ to: '', from: '', email: '', message: '' });
    };

    return (
        <div className="min-h-screen bg-background pt-20 transition-colors duration-500 font-body">
            <Header />

            <main className="mx-auto max-w-6xl px-6 py-12 gpu">

                {/* Tab Toggle */}
                <div className="flex gap-1 bg-card p-1.5 rounded-2xl border border-border shadow-sm max-w-md mx-auto mb-12">
                    <button
                        onClick={() => { setActiveView('buy'); setRedeemResult(null); }}
                        className={clsx(
                            "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                            activeView === 'buy'
                                ? 'bg-foreground text-background shadow-md'
                                : 'text-foreground/40 hover:text-foreground'
                        )}
                    >
                        <Gift size={16} /> Köp presentkort
                    </button>
                    <button
                        onClick={() => { setActiveView('redeem'); setIsPurchased(false); }}
                        className={clsx(
                            "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                            activeView === 'redeem'
                                ? 'bg-foreground text-background shadow-md'
                                : 'text-foreground/40 hover:text-foreground'
                        )}
                    >
                        <CreditCard size={16} /> Lös in kod
                    </button>
                </div>

                <AnimatePresence mode="wait">

                    {/* ═══ REDEEM VIEW ═══ */}
                    {activeView === 'redeem' && (
                        <motion.div
                            key="redeem"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-lg mx-auto space-y-8"
                        >
                            <div className="text-center space-y-3">
                                <h1 className="font-heading text-3xl font-bold text-foreground">Lös in presentkort</h1>
                                <p className="text-foreground/50 text-sm">Ange din presentkortskod nedan för att kontrollera saldot.</p>
                            </div>

                            <div className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Presentkortskod</label>
                                    <input
                                        type="text"
                                        value={redeemCode}
                                        onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                                        placeholder="GLOW-XXXX-XXXX"
                                        className="w-full h-14 px-6 rounded-2xl bg-background border border-border focus:border-champagne-500 outline-none transition-all text-lg font-mono tracking-widest text-center text-foreground placeholder:text-foreground/20"
                                    />
                                </div>

                                <button
                                    onClick={handleRedeem}
                                    className="w-full h-14 bg-foreground text-background rounded-2xl font-bold text-sm hover:bg-champagne-600 hover:text-white transition-all shadow-lg"
                                >
                                    Kontrollera saldo
                                </button>

                                <AnimatePresence>
                                    {redeemResult && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className={clsx(
                                                "p-6 rounded-2xl border text-center",
                                                redeemResult.success
                                                    ? "bg-green-500/5 border-green-500/20"
                                                    : "bg-red-500/5 border-red-500/20"
                                            )}
                                        >
                                            <div className={clsx(
                                                "w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center",
                                                redeemResult.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                            )}>
                                                {redeemResult.success ? <CheckCircle2 size={24} /> : <CreditCard size={24} />}
                                            </div>
                                            <p className={clsx(
                                                "font-bold text-sm",
                                                redeemResult.success ? "text-green-600" : "text-red-500"
                                            )}>
                                                {redeemResult.message}
                                            </p>
                                            {redeemResult.card && (
                                                <div className="mt-4 space-y-2 text-left">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-foreground/40">Ursprungligt värde</span>
                                                        <span className="font-bold text-foreground">{redeemResult.card.value} {redeemResult.card.currency}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-foreground/40">Kvarvarande saldo</span>
                                                        <span className="font-bold text-green-600">{redeemResult.card.remainingBalance} {redeemResult.card.currency}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-foreground/40">Giltigt t.o.m</span>
                                                        <span className="font-bold text-foreground">{new Date(redeemResult.card.expiresAt).toLocaleDateString('sv-SE')}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-foreground/40">Till</span>
                                                        <span className="font-bold text-foreground">{redeemResult.card.recipientName}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ BUY VIEW ═══ */}
                    {activeView === 'buy' && !isPurchased && (
                        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start" key="purchase-view">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-10"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-champagne-600 font-bold uppercase tracking-widest text-[10px]">
                                        <Sparkles size={14} />
                                        <span>Presentkort</span>
                                    </div>
                                    <h1 className="font-heading text-4xl font-bold text-foreground leading-tight">
                                        Ge bort lite <span className="text-champagne-600">glow</span> till någon du tycker om.
                                    </h1>
                                    <p className="text-foreground/60 leading-relaxed max-w-md">
                                        Ett digitalt presentkort från Glowbook. Mottagaren får koden via e-post
                                        och kan använda den hos alla anslutna salonger.
                                    </p>
                                </div>

                                {/* Value Selection */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Välj belopp</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {VALUES.map((val) => (
                                            <button
                                                key={val}
                                                onClick={() => setSelectedValue(val)}
                                                className={clsx(
                                                    "h-14 rounded-2xl border-2 transition-all duration-300 font-bold text-sm",
                                                    selectedValue === val
                                                        ? "border-champagne-600 bg-champagne-600 text-white shadow-lg scale-105"
                                                        : "border-border bg-card text-foreground/40 hover:border-champagne-400 hover:text-foreground"
                                                )}
                                            >
                                                {val} {currency}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Recipient Info */}
                                <div className="space-y-6 bg-card p-8 rounded-[32px] border border-border shadow-sm transition-all hover:shadow-md">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Mottagaruppgifter</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-foreground/40 uppercase ml-2 tracking-widest">Till vem? *</label>
                                            <input
                                                type="text"
                                                placeholder="Namn på mottagare"
                                                className="w-full h-12 px-5 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-champagne-600/20 focus:border-champagne-600 text-sm transition-all text-foreground font-medium"
                                                value={recipient.to}
                                                onChange={(e) => setRecipient({ ...recipient, to: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-foreground/40 uppercase ml-2 tracking-widest">Från vem?</label>
                                            <input
                                                type="text"
                                                placeholder="Ditt namn (valfritt)"
                                                className="w-full h-12 px-5 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-champagne-600/20 focus:border-champagne-600 text-sm transition-all text-foreground font-medium"
                                                value={recipient.from}
                                                onChange={(e) => setRecipient({ ...recipient, from: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-foreground/40 uppercase ml-2 tracking-widest">Mottagarens E-post *</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20" size={16} />
                                            <input
                                                type="email"
                                                placeholder="e-post dit presentkortet skickas"
                                                className="w-full h-12 pl-12 pr-5 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-champagne-600/20 focus:border-champagne-600 text-sm transition-all text-foreground font-medium"
                                                value={recipient.email}
                                                onChange={(e) => setRecipient({ ...recipient, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-foreground/40 uppercase ml-2 tracking-widest">Ett litet meddelande</label>
                                        <textarea
                                            placeholder="Hoppas du njuter av din behandling! (Valfritt)"
                                            rows={3}
                                            className="w-full p-5 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-champagne-600/20 focus:border-champagne-600 text-sm transition-all resize-none text-foreground font-medium"
                                            value={recipient.message}
                                            onChange={(e) => setRecipient({ ...recipient, message: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handlePurchase}
                                    className="w-full h-16 bg-foreground text-background rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-champagne-600 hover:text-white transition-all active:scale-[0.98]"
                                >
                                    <Gift size={18} />
                                    Köp presentkort — {selectedValue} {currency}
                                </button>
                                <p className="text-[10px] text-foreground/30 text-center -mt-6">
                                    Presentkortet skickas via noreply@glowbook.se • Giltigt i 2 år
                                </p>
                            </motion.div>

                            {/* Right: Live Card Preview */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="lg:sticky lg:top-32 space-y-6"
                            >
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-center lg:text-left">Förhandsgranskning</h3>

                                <div className="relative aspect-[16/10] w-full max-w-[500px] mx-auto overflow-hidden rounded-[32px] shadow-2xl group border border-white/5">
                                    <div className="absolute inset-0 bg-[#0A0A0A] group-hover:scale-105 transition-transform duration-700">
                                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_-20%,#c5a059,transparent)]" />
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-champagne-600/5 blur-[80px]" />
                                    </div>

                                    <div className="absolute inset-0 p-10 flex flex-col justify-between z-10 text-white">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h2 className="font-heading text-2xl font-bold tracking-tighter">Glow<span className="text-champagne-400">book</span></h2>
                                                <div className="flex gap-1 text-champagne-400/50">
                                                    {[...Array(5)].map((_, i) => <Star key={i} size={8} fill="currentColor" />)}
                                                </div>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[9px] font-bold tracking-[0.2em] uppercase">
                                                Digital Gift Card
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">Värde</p>
                                            <p className="text-5xl font-heading font-black tracking-tighter">
                                                {selectedValue} <span className="text-xl opacity-60 font-sans">{currency}</span>
                                            </p>
                                        </div>

                                        <div className="flex justify-between items-end border-t border-white/10 pt-6">
                                            <div className="space-y-1">
                                                <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 font-bold">Till</p>
                                                <p className="font-bold text-sm truncate max-w-[150px] text-white/90">{recipient.to || 'Mottagarens namn'}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 font-bold">Kod</p>
                                                <p className="font-mono text-xs text-champagne-400 tracking-widest font-bold">GLOW-XXXX-XXXX</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute top-1/2 left-1/4 animate-pulse text-champagne-400/20 gpu"><Sparkles size={20} /></div>
                                    <div className="absolute bottom-1/4 right-1/3 animate-pulse text-champagne-400/20 delay-1000 gpu"><Heart size={16} /></div>
                                </div>

                                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm text-center">
                                    <p className="text-xs text-foreground/50 leading-relaxed">
                                        &quot;{recipient.message || 'Ditt personliga meddelande syns här på det digitala kortet.'}&quot;
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* ═══ SUCCESS VIEW ═══ */}
                    {activeView === 'buy' && isPurchased && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-xl mx-auto py-12 text-center space-y-8"
                            key="success-view"
                        >
                            <div className="w-24 h-24 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                                <CheckCircle2 size={48} />
                            </div>
                            <div className="space-y-4">
                                <h1 className="text-4xl font-heading font-bold text-foreground tracking-tight">Presentkortet är skickat!</h1>
                                <p className="text-foreground/60 leading-relaxed">
                                    Presentkortet på <strong>{selectedValue} {currency}</strong> har skickats till <strong className="text-foreground">{recipient.email}</strong> via noreply@glowbook.se.
                                </p>
                            </div>

                            {/* Gift Card Code */}
                            <div className="bg-card p-8 rounded-[40px] border border-border shadow-xl overflow-hidden relative text-left space-y-6">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-champagne-400 to-champagne-600" />

                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-foreground/40 uppercase font-black tracking-widest">Presentkortskod</p>
                                        <p className="text-2xl font-mono font-black tracking-[0.15em] text-champagne-600">{generatedCode}</p>
                                    </div>
                                    <button
                                        onClick={handleCopyCode}
                                        className={clsx(
                                            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border",
                                            copied
                                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                                : "bg-foreground/5 text-foreground/60 border-border hover:border-champagne-500"
                                        )}
                                    >
                                        {copied ? <><Check size={14} /> Kopierad!</> : <><Copy size={14} /> Kopiera kod</>}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] text-foreground/40 uppercase font-black tracking-widest">Belopp</p>
                                        <p className="text-xl font-black text-foreground">{selectedValue} {currency}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-foreground/40 uppercase font-black tracking-widest">Till</p>
                                        <p className="text-xl font-bold text-foreground">{recipient.to}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-foreground/40 uppercase font-black tracking-widest">Skickad till</p>
                                        <p className="text-sm font-bold text-foreground">{recipient.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-foreground/40 uppercase font-black tracking-widest">Giltigt t.o.m</p>
                                        <p className="text-sm font-bold text-foreground">{new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toLocaleDateString('sv-SE')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] text-foreground/30 pt-2 border-t border-border">
                                    <Check size={12} className="text-green-500" />
                                    Presentkortet har skickats via noreply@glowbook.se
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Link
                                    href="/"
                                    className="flex-1 h-14 border border-border text-foreground rounded-2xl font-bold hover:bg-foreground/5 transition-colors shadow-sm flex items-center justify-center"
                                >
                                    Tillbaka till startsidan
                                </Link>
                                <button
                                    onClick={handleReset}
                                    className="flex-1 h-14 bg-foreground text-background rounded-2xl font-bold hover:bg-champagne-600 hover:text-white transition-colors shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Gift size={16} /> Köp ett till
                                </button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* Background Decorations */}
            <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none overflow-hidden opacity-30">
                <div className="absolute top-1/4 -left-32 w-80 h-80 bg-champagne-200/50 dark:bg-champagne-900/10 blur-[100px] rounded-full gpu" />
                <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-champagne-300/50 dark:bg-champagne-800/10 blur-[100px] rounded-full gpu" />
            </div>
        </div>
    );
}
