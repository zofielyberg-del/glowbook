
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Compass, BookOpen, Star, Ticket, HelpCircle, AlignJustify, Sun, Moon, Calendar, User, Settings, Users, Scissors, ChevronDown, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import LocationSelector from '@/components/LocationSelector';
import { useAuth } from '@/hooks/useAuth';

import { motion, AnimatePresence } from 'framer-motion';

const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => (
    <Link
        href={href}
        className="group flex flex-col items-center gap-1.5 transition-all duration-300"
    >
        <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
            className="flex flex-col items-center gap-1.5"
        >
            <Icon size={16} className="text-foreground/40 group-hover:text-champagne-500 transition-colors" />
            <span className="text-[9px] font-black tracking-[0.1em] uppercase text-foreground/40 group-hover:text-foreground transition-colors">{label}</span>
        </motion.div>
    </Link>
);

export default function Header() {
    const { t, language, setLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const { isLoggedIn, role, isSalonOwner, isPractitioner: isPractitionerRole } = useAuth();
    const isProvider = isSalonOwner || isPractitionerRole;
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isProviderPortal = pathname?.startsWith('/provider');
    const isAdminPortal = pathname?.startsWith('/admin');
    const isOnboarding = pathname?.startsWith('/onboarding');
    const isCustomerPortal = pathname?.startsWith('/profile');

    // Force logged in UI if on a protected/portal route
    const showLoggedInUI = isLoggedIn || isProviderPortal || isAdminPortal || isCustomerPortal;

    return (
        <header
            className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between border-b border-black/5 dark:border-white/10 bg-background/80 dark:bg-black/80 px-6 md:px-12 backdrop-blur-md transition-colors duration-300 shadow-sm dark:shadow-2xl"
        >
            {/* Logo & Location */}
            <div className="flex items-center gap-4 md:gap-10 flex-1">
                <Link href="/" className="flex items-center gap-1 group shrink-0">
                    <h1 className="font-heading text-lg md:text-xl font-black tracking-[-0.04em]">
                        <span className="text-foreground">Glow</span>
                        <span className="text-champagne-500">book</span>
                    </h1>
                </Link>

                <div className="hidden lg:block">
                    <LocationSelector dark={theme === 'dark'} />
                </div>
            </div>

            {/* Nav - Center */}
            <nav className="hidden items-center gap-8 xl:gap-10 lg:flex">
                {showLoggedInUI ? (
                    isProviderPortal ? (
                        <>
                            <NavItem href="/provider" icon={Calendar} label={t('nav_dashboard')} />
                            <NavItem href="/provider/customers" icon={Users} label={t('dash_nav_customers')} />
                            <NavItem href="/provider/services" icon={Scissors} label={t('dash_nav_services')} />
                            <NavItem href="/provider/settings?tab=inbox" icon={MessageSquare} label={t('nav_inbox')} />
                        </>
                    ) : isProvider ? (
                        <>
                            <NavItem href="/search" icon={Search} label={t('nav_search')} />
                            <NavItem href="/explore" icon={Compass} label={t('discover')} />
                            <NavItem href="/provider" icon={User} label={t('my_pages')} />
                            <NavItem href="/provider/settings?tab=inbox" icon={MessageSquare} label={t('nav_inbox')} />
                        </>
                    ) : (
                        <>
                            <NavItem href="/search" icon={Search} label={t('nav_search')} />
                            <NavItem href="/explore" icon={Compass} label={t('discover')} />
                            <NavItem href="/profile" icon={User} label={t('my_pages')} />
                            <NavItem href="/support" icon={HelpCircle} label={t('nav_support')} />
                        </>
                    )
                ) : (
                    <>
                        <NavItem href="/search" icon={Search} label={t('nav_search')} />
                        <NavItem href="/explore" icon={Compass} label={t('discover')} />
                        <NavItem href="/guides" icon={BookOpen} label={t('nav_guides')} />
                        <NavItem href="/rewards" icon={Star} label={t('nav_rewards')} />
                        <NavItem href="/giftcards" icon={Ticket} label={t('nav_giftcards')} />
                        <NavItem href="/support" icon={HelpCircle} label={t('nav_support')} />
                    </>
                )}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 md:gap-8 flex-1">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-foreground/5 transition-colors text-foreground/40 hover:text-foreground"
                    aria-label="Toggle Theme"
                >
                    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-yellow-400" />}
                </button>



                {showLoggedInUI ? (
                    <div className="relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="bg-foreground text-background px-4 md:px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-champagne-500 hover:text-white transition-all shadow-md flex items-center gap-2"
                        >
                            {t('my_pages')}
                            <motion.div
                                animate={{ rotate: isMenuOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown size={12} />
                            </motion.div>
                        </button>

                        <AnimatePresence>
                            {isMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-[-1]"
                                        onClick={() => setIsMenuOpen(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-48 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
                                    >
                                        <Link
                                            href={isProvider ? "/provider" : isAdminPortal ? "/admin" : "/profile"}
                                            onClick={() => setIsMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all"
                                        >
                                            <User size={14} />
                                            {isProvider ? t('nav_dashboard') : t('my_pages')}
                                        </Link>
                                        {isProvider && (
                                            <Link
                                                href="/provider/settings"
                                                onClick={() => setIsMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all"
                                            >
                                                <Settings size={14} />
                                                {t('nav_settings')}
                                            </Link>
                                        )}
                                        <div className="h-px bg-border my-1" />
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                // Clear session data
                                                localStorage.removeItem('glowbook_salon');
                                                localStorage.removeItem('glowbook_customer');
                                                localStorage.removeItem('glowbook_admin');
                                                localStorage.removeItem('glowbook_provider_loyalty');
                                                // Redirect to home or login
                                                window.location.href = '/auth/login';
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                                        >
                                            <Star size={14} />
                                            {t('logout')}
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 md:gap-8">
                        <Link
                            href="/auth/register?role=provider"
                            className="hidden xl:block text-foreground/40 text-[9px] font-black uppercase tracking-widest hover:text-foreground transition-colors"
                        >
                            {t('action_register')}
                        </Link>
                        <Link
                            href="/auth/login"
                            className="bg-foreground/5 text-foreground border border-foreground/10 px-4 md:px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all"
                        >
                            {t('action_login')}
                        </Link>
                    </div>
                )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden ml-2 md:ml-4">
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={clsx("p-2 transition-colors", isMenuOpen ? "text-champagne-500" : "text-foreground")}
                    aria-label="Menu"
                >
                    <AlignJustify size={24} />
                </button>
            </div>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        className="fixed inset-0 z-[100] bg-background lg:hidden p-8 flex flex-col pt-24"
                    >
                        <button 
                            onClick={() => setIsMenuOpen(false)}
                            className="absolute top-8 right-8 text-foreground"
                        >
                            <AlignJustify size={32} />
                        </button>
                        
                        <div className="space-y-8 flex-1 overflow-y-auto">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40 mb-8 border-b border-border pb-4">{t('menu')}</h2>
                            
                            {/* Reusing NavItem or similar logic here for mobile */}
                            <div className="grid grid-cols-1 gap-10">
                                {showLoggedInUI ? (
                                    <>
                                        <Link href={isProvider ? "/provider" : "/profile"} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-6 group">
                                            <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center group-hover:bg-champagne-500/10 transition-colors">
                                                <User size={24} className="text-foreground/40 group-hover:text-champagne-500 transition-colors" />
                                            </div>
                                            <span className="text-lg font-bold tracking-tight">{t('my_pages')}</span>
                                        </Link>
                                        <Link href="/explore" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-6 group">
                                            <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center group-hover:bg-champagne-500/10 transition-colors">
                                                <Compass size={24} className="text-foreground/40 group-hover:text-champagne-500 transition-colors" />
                                            </div>
                                            <span className="text-lg font-bold tracking-tight">{t('discover')}</span>
                                        </Link>
                                        <Link href="/search" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-6 group">
                                            <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center group-hover:bg-champagne-500/10 transition-colors">
                                                <Search size={24} className="text-foreground/40 group-hover:text-champagne-500 transition-colors" />
                                            </div>
                                            <span className="text-lg font-bold tracking-tight">{t('nav_search')}</span>
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/explore" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-6 group">
                                            <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center group-hover:bg-champagne-500/10 transition-colors">
                                                <Compass size={24} className="text-foreground/40 group-hover:text-champagne-500 transition-colors" />
                                            </div>
                                            <span className="text-lg font-bold tracking-tight">{t('discover')}</span>
                                        </Link>
                                        <Link href="/auth/register?role=provider" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-6 group">
                                            <div className="w-12 h-12 rounded-2xl bg-champagne-500 flex items-center justify-center shadow-lg shadow-champagne-500/20">
                                                <Star size={24} className="text-white" />
                                            </div>
                                            <span className="text-lg font-bold tracking-tight">{t('action_register')} Studio</span>
                                        </Link>
                                        <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-6 group">
                                            <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center">
                                                <AlignJustify size={24} className="text-background" />
                                            </div>
                                            <span className="text-lg font-bold tracking-tight">{t('action_login')}</span>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="pt-12 border-t border-border mt-auto">
                           <LocationSelector dark={theme === 'dark'} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}

