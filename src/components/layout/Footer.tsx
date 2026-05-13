'use client';

import Link from 'next/link';
import { Sparkles, Instagram } from 'lucide-react';

import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="relative border-t border-black/5 dark:border-white/5 bg-white/60 dark:bg-[#0a0a0a]/80 backdrop-blur-xl">
      {/* Decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[1px] bg-gradient-to-r from-transparent via-champagne-500/40 to-transparent" />

      <div className="max-w-screen-xl mx-auto px-6 lg:px-20">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-champagne-400 to-champagne-600 flex items-center justify-center shadow-lg shadow-champagne-500/20 group-hover:shadow-champagne-500/40 transition-shadow duration-500">
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="font-heading font-black text-lg text-foreground tracking-tight">
                Glow<span className="text-champagne-600">book</span>
              </span>
            </Link>
            <p className="text-sm text-foreground/40 dark:text-white/40 leading-relaxed max-w-xs">
              {t('footer_desc')}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/30 dark:text-white/30">
              {t('footer_quick_links')}
            </h4>
            <nav className="flex flex-col gap-2.5">
              <Link
                href="/explore"
                className="text-sm text-foreground/60 dark:text-white/50 hover:text-champagne-600 dark:hover:text-champagne-400 transition-colors duration-300 w-fit"
              >
                {t('footer_explore')}
              </Link>
              <Link
                href="/auth/register?role=provider"
                className="text-sm text-foreground/60 dark:text-white/50 hover:text-champagne-600 dark:hover:text-champagne-400 transition-colors duration-300 w-fit"
              >
                {t('footer_register')}
              </Link>
              <Link
                href="/support"
                className="text-sm text-foreground/60 dark:text-white/50 hover:text-champagne-600 dark:hover:text-champagne-400 transition-colors duration-300 w-fit"
              >
                {t('nav_support')}
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/30 dark:text-white/30">
              {t('footer_legal')}
            </h4>
            <nav className="flex flex-col gap-2.5">
              <Link
                href="/policies"
                className="text-sm text-foreground/60 dark:text-white/50 hover:text-champagne-600 dark:hover:text-champagne-400 transition-colors duration-300 w-fit"
              >
                {t('footer_policies')}
              </Link>
              <Link
                href="/policies#integritetspolicy"
                className="text-sm text-foreground/60 dark:text-white/50 hover:text-champagne-600 dark:hover:text-champagne-400 transition-colors duration-300 w-fit"
              >
                {t('footer_privacy')}
              </Link>
              <Link
                href="/policies#cookies"
                className="text-sm text-foreground/60 dark:text-white/50 hover:text-champagne-600 dark:hover:text-champagne-400 transition-colors duration-300 w-fit"
              >
                {t('footer_cookies')}
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-black/5 dark:border-white/5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-foreground/30 dark:text-white/25 font-medium tracking-wide">
            © {currentYear} Glowbook. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="https://instagram.com/glowbook.se" className="text-foreground/30 hover:text-champagne-600 transition-colors flex items-center gap-1.5 hover:scale-105">
              <Instagram size={18} />
              <span className="text-xs font-bold tracking-tight">glowbook.se</span>
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-foreground/25 dark:text-white/20 font-medium tracking-wider uppercase">
              {t('footer_platform_online')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
