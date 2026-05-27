'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import Header from "@/components/layout/Header";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const token = searchParams?.get('token') || '';

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
        throw new Error(data.error || 'Kunde inte återställa lösenordet.');
      }
      setIsSuccess(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !error) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-foreground/40 animate-spin" /></div>;
  }

  if (isSuccess) {
    return (
      <div className="text-center py-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </motion.div>
        <h3 className="text-xl font-bold text-foreground mb-2">Lösenordet har ändrats!</h3>
        <p className="text-foreground/60 text-sm mb-4 leading-relaxed">
          Ditt lösenord har uppdaterats framgångsrikt. Du omdirigeras nu till inloggningssidan...
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium text-center">
          {error}
        </motion.div>
      )}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">Nytt lösenord</label>
        <div className="mt-2 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-foreground/30" />
          </div>
          <input 
            id="password" 
            type={showPassword ? 'text' : 'password'} 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full pl-11 px-4 py-4 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all leading-normal placeholder:text-foreground/30 text-sm font-medium" 
            placeholder="Minst 8 tecken" 
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-foreground/30 hover:text-champagne-500 focus:outline-none transition-colors p-2">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">Bekräfta nytt lösenord</label>
        <div className="mt-2 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-foreground/30" />
          </div>
          <input 
            id="confirmPassword" 
            type={showPassword ? 'text' : 'password'} 
            required 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            className="w-full pl-11 px-4 py-4 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 focus:ring-2 focus:ring-champagne-500/20 outline-none transition-all leading-normal placeholder:text-foreground/30 text-sm font-medium" 
            placeholder="Upprepa lösenordet" 
          />
        </div>
      </div>
      <button 
        type="submit" 
        disabled={isLoading || !token} 
        className="w-full bg-[#111] dark:bg-white text-white dark:text-[#111] py-3.5 rounded-xl font-bold hover:bg-champagne-600 dark:hover:bg-champagne-300 transition-colors shadow-lg flex justify-center items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-white dark:text-[#111]" /> : <span>Spara nytt lösenord</span>}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
            <h2 className="text-2xl font-heading font-bold text-white mb-1">Välj nytt lösenord</h2>
            <p className="text-white/60 text-xs">Ange ditt nya lösenord nedan</p>
          </div>
          
          <div className="p-8">
            <Suspense fallback={<div className="text-center py-6 text-foreground/50">Laddar...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
