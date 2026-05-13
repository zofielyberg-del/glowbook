
'use client';

import Header from "@/components/layout/Header";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mail, MessageSquare, CheckCircle, Clock, ChevronLeft, User, ShieldCheck, Key, ArrowRight } from "lucide-react";
import clsx from "clsx";

type ThreadMessage = {
    sender: 'admin' | 'customer';
    text: string;
    timestamp: string;
};

type Ticket = {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: 'unread' | 'read';
    timestamp: string;
    replied?: boolean;
    thread?: ThreadMessage[];
};

export default function SupportPage() {
    const [view, setView] = useState<'form' | 'auth' | 'tickets' | 'thread'>('form');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [allTickets, setAllTickets] = useState<Ticket[]>([]);

    const [email, setEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [sentCode, setSentCode] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [newMessageText, setNewMessageText] = useState('');
    const [form, setForm] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    // Auto-detect if provider is logged in
    useEffect(() => {
        const savedSalon = localStorage.getItem('glowbook_salon');
        if (savedSalon) {
            const data = JSON.parse(savedSalon);
            if (data.email) {
                setEmail(data.email);
                setIsAuthenticated(true);
                setForm(prev => ({
                    ...prev,
                    name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.businessName || '',
                    email: data.email
                }));
            }
        }
    }, []);

    useEffect(() => {
        const loadTickets = () => {
            const stored = localStorage.getItem('glowbook_messages');
            if (stored) setAllTickets(JSON.parse(stored));
        };
        loadTickets();
        window.addEventListener('glowbook_update', loadTickets);
        window.addEventListener('storage', loadTickets);
        return () => {
            window.removeEventListener('glowbook_update', loadTickets);
            window.removeEventListener('storage', loadTickets);
        };
    }, []);

    const userTickets = useMemo(() => {
        if (!isAuthenticated) return [];
        return allTickets.filter(t => t.email.toLowerCase() === email.toLowerCase());
    }, [allTickets, email, isAuthenticated]);

    const selectedTicket = useMemo(() => {
        return allTickets.find(t => t.id === selectedTicketId);
    }, [allTickets, selectedTicketId]);

    const handleSendCode = () => {
        if (!email.includes('@')) return;
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        setSentCode(code);
    };

    const verifyCode = () => {
        if (verificationCode === sentCode) {
            setIsAuthenticated(true);
            setView('tickets');
        } else {
            alert("Fel kod. Försök igen.");
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const tid = Date.now().toString();
        const newMessage: Ticket = {
            id: tid,
            ...form,
            status: 'unread',
            timestamp: new Date().toISOString(),
            thread: [{ sender: 'customer', text: form.message, timestamp: new Date().toISOString() }]
        };

        const updated = [newMessage, ...allTickets];
        localStorage.setItem('glowbook_messages', JSON.stringify(updated));
        setAllTickets(updated);
        setEmail(form.email);
        setIsAuthenticated(true);
        setView('tickets');

        // Also notify the provider inbox if logged in as provider
        const savedSalon = localStorage.getItem('glowbook_salon');
        if (savedSalon) {
            const confirmNotification = {
                id: `support-${tid}`,
                type: 'support_ticket',
                title: `Supportärende: ${form.subject}`,
                message: `Ditt ärende har mottagits. Vi svarar vanligtvis inom några timmar. Referens: #${tid.slice(-6)}`,
                timestamp: new Date().toISOString(),
                read: false,
            };
            const existingNotifications = JSON.parse(localStorage.getItem('glowbook_provider_notifications') || '[]');
            localStorage.setItem('glowbook_provider_notifications', JSON.stringify([confirmNotification, ...existingNotifications]));
            window.dispatchEvent(new Event('glowbook_update'));
        }
    };

    const handleReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicket || !newMessageText.trim()) return;

        const reply: ThreadMessage = {
            sender: 'customer',
            text: newMessageText,
            timestamp: new Date().toISOString()
        };

        const updated = allTickets.map(t => {
            if (t.id === selectedTicket.id) {
                return {
                    ...t,
                    status: 'unread' as const,
                    thread: [...(t.thread || []), reply]
                };
            }
            return t;
        });

        localStorage.setItem('glowbook_messages', JSON.stringify(updated));
        setAllTickets(updated);
        setNewMessageText('');
        window.dispatchEvent(new Event('glowbook_update'));
    };

    // LIGHT: cream bg input on white card | DARK: subtle dark bg input on dark card
    // LIGHT: cream bg input on white card | DARK: subtle dark bg input on dark card
    const inputClass = "w-full px-5 py-3.5 rounded-xl bg-[#F5F3EE] dark:bg-white/10 border border-black/10 dark:border-white/10 focus:border-champagne-500 focus:bg-white dark:focus:bg-white/20 outline-none transition-all text-sm font-medium text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30";

    return (
        <div className="min-h-screen bg-[#F9F7F2] dark:bg-black text-black dark:text-white flex flex-col font-outfit transition-colors duration-500">
            <Header />

            <main className="flex-1 flex flex-col items-center px-6 pt-32 pb-24">
                <div className="w-full max-w-lg space-y-8 gpu">

                    {/* Header */}
                    <div className="text-center space-y-5">
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-heading font-bold text-black dark:text-white"
                        >
                            Hur kan vi <span className="text-champagne-600">hjälpa dig?</span>
                        </motion.h1>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setView('form')}
                                className={clsx("px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm",
                                    view === 'form'
                                        ? "bg-black text-white dark:bg-champagne-600 dark:text-white"
                                        : "bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white")}
                            >
                                Nytt ärende
                            </button>
                            <button
                                onClick={() => {
                                    if (isAuthenticated) setView('tickets');
                                    else setView('auth');
                                }}
                                className={clsx("px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm",
                                    (view === 'tickets' || view === 'auth' || view === 'thread')
                                        ? "bg-black text-white dark:bg-champagne-600 dark:text-white"
                                        : "bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white")}
                            >
                                Mina ärenden
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {view === 'form' ? (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-[#141414] rounded-2xl shadow-xl border border-black/5 dark:border-white/10 overflow-hidden"
                            >
                                {/* Form Header - always dark, works in both modes */}
                                <div className="bg-[#111] p-8 text-center">
                                    <MessageSquare className="mx-auto mb-3 text-champagne-500" size={28} />
                                    <h2 className="text-lg font-bold text-white">Starta en konversation</h2>
                                    <p className="text-white/40 text-xs mt-1">Vi svarar vanligtvis inom några timmar.</p>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                    {!isAuthenticated && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5 font-sans">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30 ml-1">Ditt Namn</label>
                                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Anna Svensson" />
                                            </div>
                                            <div className="space-y-1.5 font-sans">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30 ml-1">Email</label>
                                                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="din@email.com" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-1.5 font-sans">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30 ml-1">Ämne</label>
                                        <select required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className={`${inputClass} appearance-none bg-no-repeat bg-[right_1.25rem_center] dark:bg-slate-900`}>
                                            <option value="" className="bg-white dark:bg-black">Välj ämne...</option>
                                            <option value="Bokning" className="bg-white dark:bg-black">Bokning &amp; Betalning</option>
                                            <option value="Konto" className="bg-white dark:bg-black">Konto &amp; Inloggning</option>
                                            <option value="Tekniskt" className="bg-white dark:bg-black">Tekniskt problem</option>
                                            <option value="Övrigt" className="bg-white dark:bg-black">Övrigt</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 font-sans">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30 ml-1">Beskrivning</label>
                                        <textarea required rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className={`${inputClass} resize-none`} placeholder="Beskriv ditt ärende..." />
                                    </div>
                                    <button type="submit" className="w-full bg-black dark:bg-champagne-600 text-white py-4 rounded-xl font-bold text-sm hover:bg-champagne-600 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]">
                                        Skicka meddelande <Send size={14} />
                                    </button>
                                </form>
                            </motion.div>
                        ) : view === 'auth' ? (
                            <motion.div
                                key="auth"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-[#141414] p-8 rounded-2xl shadow-lg border border-black/5 dark:border-white/10 text-center space-y-6"
                            >
                                <div className="w-16 h-16 bg-champagne-500/10 text-champagne-600 rounded-2xl flex items-center justify-center mx-auto border border-champagne-500/20">
                                    <ShieldCheck size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-xl font-heading font-bold text-black dark:text-white">Säker inloggning</h2>
                                    <p className="text-black/40 dark:text-white/40 text-sm">Verifiera din mail för att se dina ärenden.</p>
                                </div>

                                {!sentCode ? (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5 text-left">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30 ml-1">Din emailadress</label>
                                            <input
                                                type="email"
                                                placeholder="din@email.com"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <button
                                            onClick={handleSendCode}
                                            className="w-full bg-champagne-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-champagne-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            Skicka kod <Send size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        <div className="bg-champagne-500/10 p-4 rounded-xl border border-champagne-500/20">
                                            <p className="text-[10px] font-bold text-champagne-600 uppercase tracking-widest mb-1">Demo-kod (simulerad):</p>
                                            <p className="font-bold text-black dark:text-white text-2xl tracking-[0.2em]">{sentCode}</p>
                                        </div>
                                        <div className="space-y-1.5 text-left">
                                            <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest ml-1">Ange verifieringskod</label>
                                            <input
                                                maxLength={4}
                                                type="text"
                                                placeholder="0000"
                                                value={verificationCode}
                                                onChange={e => setVerificationCode(e.target.value)}
                                                className={`${inputClass} text-center text-xl tracking-[0.3em] font-bold`}
                                            />
                                        </div>
                                        <button
                                            onClick={verifyCode}
                                            className="w-full bg-black dark:bg-champagne-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-champagne-600 transition-all"
                                        >
                                            Verifiera &amp; fortsätt
                                        </button>
                                        <button onClick={() => setSentCode(null)} className="text-xs text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors underline underline-offset-4">Byt emailadress</button>
                                    </div>
                                )}
                            </motion.div>
                        ) : view === 'tickets' ? (
                            <motion.div
                                key="tickets"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between bg-white dark:bg-[#141414] p-4 rounded-xl border border-black/5 dark:border-white/10 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest">Inloggad som</p>
                                            <p className="font-bold text-black dark:text-white text-sm">{email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setIsAuthenticated(false); setView('auth'); }} className="text-xs text-black/30 dark:text-white/30 hover:text-red-500 transition-colors">Logga ut</button>
                                </div>

                                <div className="space-y-3">
                                    {userTickets.length > 0 ? userTickets.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => { setSelectedTicketId(t.id); setView('thread'); }}
                                            className="w-full bg-white dark:bg-[#141414] p-5 rounded-xl border border-black/5 dark:border-white/10 shadow-sm hover:shadow-md transition-all text-left flex justify-between items-center group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", t.replied ? "bg-green-500/10 text-green-500" : "bg-champagne-500/10 text-champagne-500")}>
                                                    {t.replied ? <CheckCircle size={18} /> : <Clock size={18} />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-black dark:text-white text-sm group-hover:text-champagne-600 transition-colors">{t.subject}</h4>
                                                    <p className="text-[10px] text-black/30 dark:text-white/30 font-medium mt-0.5">#{t.id.slice(-6)} · {new Date(t.timestamp).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {t.replied && <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full">Svar</span>}
                                                <ArrowRight size={16} className="text-black/10 dark:text-white/10 group-hover:text-champagne-600 transition-all" />
                                            </div>
                                        </button>
                                    )) : (
                                        <div className="py-16 text-center space-y-4 bg-white dark:bg-[#141414] rounded-xl border border-dashed border-black/10 dark:border-white/10">
                                            <div className="w-16 h-16 bg-[#F5F3EE] dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-black/10 dark:text-white/10">
                                                <Mail size={28} />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-bold text-black/30 dark:text-white/30">Inga ärenden ännu</h3>
                                                <p className="text-black/30 dark:text-white/30 text-xs max-w-xs mx-auto">När du skickar in ett ärende dyker det upp här.</p>
                                            </div>
                                            <button onClick={() => setView('form')} className="px-5 py-2.5 bg-black dark:bg-champagne-600 text-white rounded-full font-bold text-xs hover:bg-champagne-600 transition-colors">Starta nytt ärende</button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="thread"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-[#141414] rounded-2xl shadow-lg border border-black/5 dark:border-white/10 overflow-hidden flex flex-col h-[600px]"
                            >
                                {/* Thread Header - always dark */}
                                <div className="bg-[#111] p-5 flex items-center justify-between">
                                    <button onClick={() => setView('tickets')} className="flex items-center gap-2 text-white/50 hover:text-white transition-all">
                                        <ChevronLeft size={18} />
                                        <span className="font-bold text-xs">Tillbaka</span>
                                    </button>
                                    <div className="text-center">
                                        <h3 className="font-bold text-sm text-white">{selectedTicket?.subject}</h3>
                                        <p className="text-[10px] text-white/30 mt-0.5">#{selectedTicket?.id.slice(-6)}</p>
                                    </div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-champagne-500 animate-pulse" />
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAFAF8] dark:bg-[#0A0A0A]">
                                    {selectedTicket?.thread?.map((m, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={clsx("flex flex-col", m.sender === 'admin' ? "items-start" : "items-end")}
                                        >
                                            <div className={clsx("max-w-[80%] p-4 rounded-2xl text-sm",
                                                m.sender === 'admin'
                                                    ? "bg-white dark:bg-[#1A1A1A] text-black dark:text-white rounded-bl-md border border-black/5 dark:border-white/10"
                                                    : "bg-[#111] text-white rounded-br-md")}>
                                                <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider opacity-40">
                                                    {m.sender === 'admin' ? <ShieldCheck size={10} className="text-champagne-600" /> : <User size={10} />}
                                                    <span>{m.sender === 'admin' ? 'Support' : 'Du'} · {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                                </div>
                                                <p className="leading-relaxed">{m.text}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Input */}
                                <div className="p-4 bg-white dark:bg-[#141414] border-t border-black/5 dark:border-white/10">
                                    <form onSubmit={handleReply} className="flex gap-3 items-center">
                                        <input
                                            value={newMessageText}
                                            onChange={e => setNewMessageText(e.target.value)}
                                            placeholder="Skriv ditt svar..."
                                            className="flex-1 pl-5 pr-4 py-3 rounded-xl bg-[#F5F3EE] dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-champagne-500 outline-none transition-all text-sm font-medium text-black dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20"
                                        />
                                        <button type="submit" className="p-3 bg-black dark:bg-champagne-600 text-white rounded-xl hover:bg-champagne-600 transition-all active:scale-95">
                                            <Send size={16} />
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
