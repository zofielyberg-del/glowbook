'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Ogiltig eller saknad återställningslänk.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token) {
            setError('Ogiltig återställningslänk.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Lösenorden matchar inte.');
            return;
        }

        if (password.length < 8) {
            setError('Lösenordet måste vara minst 8 tecken långt.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Kunde inte återställa lösenordet. Länken kan ha gått ut.');
            }

            setIsSuccess(true);
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/auth/login');
            }, 3000);
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token && !error) {
        return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-800/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900/40 rounded-full blur-[100px]" />
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <Link href="/" className="inline-block mb-6 group">
                        <h2 className="text-3xl font-light tracking-widest uppercase transition-all duration-300 group-hover:scale-105">
                            Glow<span className="font-bold">Book</span>
                        </h2>
                        <div className="h-[1px] w-0 bg-white mx-auto mt-2 transition-all duration-300 group-hover:w-full"></div>
                    </Link>
                    <h2 className="mt-2 text-3xl font-light tracking-tight text-white">
                        Välj nytt lösenord
                    </h2>
                </motion.div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-zinc-900/50 backdrop-blur-xl py-8 px-4 shadow-2xl border border-zinc-800/50 sm:rounded-2xl sm:px-10"
                >
                    {isSuccess ? (
                        <div className="text-center py-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <CheckCircle2 className="w-8 h-8 text-white" />
                            </motion.div>
                            <h3 className="text-xl font-medium text-white mb-2">Lösenordet är ändrat!</h3>
                            <p className="text-zinc-400 text-sm mb-8">
                                Ditt lösenord har uppdaterats. Du omdirigeras till inloggningen...
                            </p>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    className="p-3 bg-red-950/50 border border-red-900/50 rounded-xl text-red-200 text-sm text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                                    Nytt lösenord
                                </label>
                                <div className="mt-2 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-zinc-500" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none block w-full pl-10 pr-10 px-3 py-3 border border-zinc-800 rounded-xl shadow-sm placeholder-zinc-500 bg-zinc-950/50 text-white focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all sm:text-sm"
                                        placeholder="Minst 8 tecken"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-zinc-400 hover:text-white focus:outline-none transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300">
                                    Bekräfta nytt lösenord
                                </label>
                                <div className="mt-2 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-zinc-500" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="appearance-none block w-full pl-10 pr-10 px-3 py-3 border border-zinc-800 rounded-xl shadow-sm placeholder-zinc-500 bg-zinc-950/50 text-white focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all sm:text-sm"
                                        placeholder="Upprepa lösenordet"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !token}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-black bg-white hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-black transition-all disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <span className="relative z-10 flex items-center">
                                        Spara nytt lösenord
                                    </span>
                                )}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
