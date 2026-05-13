
'use client';

import Header from "@/components/layout/Header";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, ArrowLeft, Send, Key, Check } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

type Method = 'email' | 'sms';
type Step = 'choose' | 'verify' | 'reset' | 'done';

export default function ForgotPasswordPage() {
    const [method, setMethod] = useState<Method>('email');
    const [step, setStep] = useState<Step>('choose');
    const [contactValue, setContactValue] = useState('');
    const [code, setCode] = useState('');
    const [sentCode, setSentCode] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const inputClass = "w-full px-4 py-3.5 rounded-xl bg-[#F5F3EE] dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-champagne-500 outline-none transition-all text-sm font-medium text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30";

    const handleSendCode = () => {
        if (!contactValue) {
            setError(method === 'email' ? 'Ange din e-postadress' : 'Ange ditt telefonnummer');
            return;
        }
        setError('');
        const demoCode = String(Math.floor(1000 + Math.random() * 9000));
        setSentCode(demoCode);
        setStep('verify');
    };

    const handleVerifyCode = () => {
        if (code === sentCode) {
            setError('');
            setStep('reset');
        } else {
            setError('Fel verifieringskod. Försök igen.');
        }
    };

    const handleResetPassword = () => {
        if (newPassword.length < 6) {
            setError('Lösenordet måste vara minst 6 tecken');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Lösenorden matchar inte');
            return;
        }
        setError('');
        setStep('done');
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] dark:bg-black flex flex-col transition-colors duration-500">
            <Header />

            <main className="flex-1 flex items-center justify-center p-6 pt-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-[#141414] w-full max-w-md rounded-2xl shadow-xl border border-black/5 dark:border-white/10 overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-[#111] p-6 text-center">
                        <div className="w-14 h-14 bg-champagne-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Key size={28} className="text-champagne-400" />
                        </div>
                        <h2 className="text-xl font-heading font-bold text-white mb-1">Glömt lösenord</h2>
                        <p className="text-white/40 text-sm">
                            {step === 'choose' && 'Välj hur du vill återställa ditt lösenord'}
                            {step === 'verify' && 'Ange verifieringskoden'}
                            {step === 'reset' && 'Skapa ett nytt lösenord'}
                            {step === 'done' && 'Lösenordet har återställts!'}
                        </p>
                    </div>

                    <div className="p-8 space-y-5">
                        {step === 'choose' && (
                            <>
                                {/* Method Selection */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setMethod('email')}
                                        className={clsx(
                                            "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                            method === 'email'
                                                ? "border-champagne-500 bg-champagne-500/5"
                                                : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                                        )}
                                    >
                                        <Mail size={24} className={method === 'email' ? 'text-champagne-500' : 'text-black/30 dark:text-white/30'} />
                                        <span className={clsx("text-sm font-bold", method === 'email' ? 'text-champagne-600' : 'text-black/50 dark:text-white/50')}>E-post</span>
                                    </button>
                                    <button
                                        onClick={() => setMethod('sms')}
                                        className={clsx(
                                            "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                            method === 'sms'
                                                ? "border-champagne-500 bg-champagne-500/5"
                                                : "border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                                        )}
                                    >
                                        <Phone size={24} className={method === 'sms' ? 'text-champagne-500' : 'text-black/30 dark:text-white/30'} />
                                        <span className={clsx("text-sm font-bold", method === 'sms' ? 'text-champagne-600' : 'text-black/50 dark:text-white/50')}>SMS</span>
                                    </button>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">
                                        {method === 'email' ? 'Din e-postadress' : 'Ditt telefonnummer'}
                                    </label>
                                    <input
                                        type={method === 'email' ? 'email' : 'tel'}
                                        placeholder={method === 'email' ? 'din@email.com' : '+46 70 123 4567'}
                                        value={contactValue}
                                        onChange={e => setContactValue(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>

                                {error && <p className="text-red-500 text-sm">{error}</p>}

                                <button
                                    onClick={handleSendCode}
                                    className="w-full bg-black dark:bg-champagne-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-champagne-600 transition-all flex items-center justify-center gap-2 shadow-md"
                                >
                                    Skicka kod <Send size={14} />
                                </button>
                            </>
                        )}

                        {step === 'verify' && (
                            <>
                                <div className="bg-champagne-500/10 p-4 rounded-xl border border-champagne-500/20 text-center">
                                    <p className="text-[10px] font-bold text-champagne-600 uppercase tracking-widest mb-1">
                                        Demo-kod (simulerad):
                                    </p>
                                    <p className="font-bold text-black dark:text-white text-2xl tracking-[0.2em]">{sentCode}</p>
                                    <p className="text-black/30 dark:text-white/30 text-xs mt-2">
                                        Skickad till {method === 'email' ? 'din e-post' : 'ditt nummer'}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Ange verifieringskod</label>
                                    <input
                                        maxLength={4}
                                        type="text"
                                        placeholder="0000"
                                        value={code}
                                        onChange={e => setCode(e.target.value)}
                                        className={`${inputClass} text-center text-xl tracking-[0.3em] font-bold`}
                                    />
                                </div>

                                {error && <p className="text-red-500 text-sm">{error}</p>}

                                <button
                                    onClick={handleVerifyCode}
                                    className="w-full bg-black dark:bg-champagne-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-champagne-600 transition-all shadow-md"
                                >
                                    Verifiera
                                </button>

                                <button onClick={() => { setStep('choose'); setSentCode(null); setCode(''); setError(''); }} className="w-full text-center text-xs text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors underline underline-offset-4">
                                    Skicka kod igen
                                </button>
                            </>
                        )}

                        {step === 'reset' && (
                            <>
                                <div>
                                    <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Nytt lösenord</label>
                                    <input
                                        type="password"
                                        placeholder="Minst 6 tecken"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Bekräfta lösenord</label>
                                    <input
                                        type="password"
                                        placeholder="Upprepa lösenordet"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>

                                {error && <p className="text-red-500 text-sm">{error}</p>}

                                <button
                                    onClick={handleResetPassword}
                                    className="w-full bg-black dark:bg-champagne-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-champagne-600 transition-all shadow-md"
                                >
                                    Återställ lösenord
                                </button>
                            </>
                        )}

                        {step === 'done' && (
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                                    <Check size={32} className="text-green-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-black dark:text-white">Lösenordet är ändrat!</h3>
                                    <p className="text-black/40 dark:text-white/40 text-sm mt-1">Du kan nu logga in med ditt nya lösenord.</p>
                                </div>
                                <Link
                                    href="/auth/login"
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-black dark:bg-champagne-600 text-white rounded-full text-sm font-bold hover:bg-champagne-600 transition-all shadow-md"
                                >
                                    Logga in
                                </Link>
                            </div>
                        )}

                        {step !== 'done' && (
                            <Link href="/auth/login" className="flex items-center justify-center gap-2 text-sm text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors mt-4">
                                <ArrowLeft size={14} /> Tillbaka till inloggning
                            </Link>
                        )}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
