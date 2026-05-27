'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import Header from "@/components/layout/Header";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Något gick fel, försök igen.');
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
            <Header />

            <main className="flex-1 flex items-center justify-center p-6 pt-24 relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden z-10"
                >
                    <div className="bg-[#111] p-6 text-center">
                        <h2 className="text-2xl font-heading font-bold text-white mb-1">Återställ lösenord</h2>
                        <p className="text-white/60 text-xs">Fyll i din e-post så hjälper vi dig vidare</p>
                    </div>

                    <div className="p-8">
                        {isSuccess ? (
                            <div className="text-center py-4">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                                >
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </motion.div>
                                <h3 className="text-xl font-bold text-foreground mb-2">Kolla din inkorg!</h3>
                                <p className="text-foreground/60 text-sm mb-8 leading-relaxed">
                                    Vi har skickat instruktioner till <span className="text-foreground font-semibold">{email}</span> för hur du återställer ditt lösenord.
                                </p>
                                <Link 
                                    href="/auth/login"
                                    className="w-full bg-[#111] dark:bg-white text-white dark:text-[#111] py-3.5 rounded-xl font-bold hover:bg-champagne-600 dark:hover:bg-champagne-300 transition-colors shadow-lg flex items-center justify-center gap-2 text-sm"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Tillbaka till inloggning
                                </Link>
                            </div>
                        ) : (
                            <form className="space-y-5" onSubmit={handleSubmit}>
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium text-center"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <div className="space-y-1.5">
                                    <label htmlFor="email" className="block text-sm font-medium text-foreground">
                                        E-postadress
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-foreground/30" />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-11 px-4 py-4 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all leading-normal placeholder:text-foreground/30 text-sm font-medium"
                                            placeholder="din.epost@exempel.se"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !email}
                                    className="w-full bg-[#111] dark:bg-white text-white dark:text-[#111] py-3.5 rounded-xl font-bold hover:bg-champagne-600 dark:hover:bg-champagne-300 transition-colors shadow-lg flex justify-center items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-white dark:text-[#111]" />
                                    ) : (
                                        <span>Skicka återställningslänk</span>
                                    )}
                                </button>

                                <div className="text-center pt-2">
                                    <Link href="/auth/login" className="text-xs font-bold text-foreground/50 hover:text-champagne-600 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider">
                                        <ArrowLeft className="w-4 h-4" />
                                        Tillbaka till inloggning
                                    </Link>
                                </div>
                            </form>
                        )}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
