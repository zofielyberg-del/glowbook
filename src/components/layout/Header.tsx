'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Compass, BookOpen, Star, Ticket, HelpCircle, 
    AlignJustify, Sun, Moon, Calendar, User, Settings, 
    Users, Scissors, ChevronDown, MessageSquare, X, Check, Globe, LogOut 
} from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import LocationSelector from '@/components/LocationSelector';
import { useAuth } from '@/hooks/useAuth';

const LANGUAGES = [
    { id: 'Svenska' as const, code: 'SV', label: 'Svenska' },
    { id: 'English' as const, code: 'EN', label: 'English' },
    { id: 'Norska' as const, code: 'NO', label: 'Norsk' },
    { id: 'Danska' as const, code: 'DK', label: 'Dansk' },
    { id: 'Finska' as const, code: 'FI', label: 'Suomi' },
    { id: 'Isländska' as const, code: 'IS', label: 'Íslenska' },
];

const NavLink = ({ href, label, active }: { href: string; label: string; active?: boolean }) => (
    <Link
        href={href}
        className={clsx(
            "relative text-[10.5px] xl:text-[11.5px] 2xl:text-[12px] font-medium tracking-[0.08em] xl:tracking-[0.12em] uppercase transition-colors duration-200 py-1 shrink-0 whitespace-nowrap",
            active 
                ? "text-[#C2A26A]" 
                : "text-foreground/60 hover:text-[#C2A26A]"
        )}
    >
        {label}
        {active && (
            <span className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-[#C2A26A] rounded-full" />
        )}
    </Link>
);

export default function Header() {
    const { language, setLanguage, t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const { isLoggedIn, isAdmin, isSalonOwner, isPractitioner: isPractitionerRole, logout, user } = useAuth();
    const isProvider = isSalonOwner || isPractitionerRole;
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const [currentTab, setCurrentTab] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentTab(new URLSearchParams(window.location.search).get('tab'));
        }
    }, [pathname, isMobileMenuOpen]);

    const currentLang = LANGUAGES.find(l => l.id === language) || LANGUAGES[0];

    const isProviderPortal = pathname?.startsWith('/provider');
    const isAdminPortal = pathname?.startsWith('/admin');
    const isCustomerPortal = pathname?.startsWith('/profile');

    const showLoggedInUI = isLoggedIn || isProviderPortal || isAdminPortal || isCustomerPortal;

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobileMenuOpen]);

    return (
        <>
            <header
                className="fixed top-0 left-0 right-0 z-50 h-20 border-b border-border/40 bg-background/85 dark:bg-[#0B0B0C]/85 backdrop-blur-xl transition-colors"
            >
                <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between px-6 md:px-10 relative">
                    {/* Left: Logo & Language Selector */}
                    <div className="flex items-center gap-3 sm:gap-4 z-10 shrink-0">
                        <Link href="/" className="flex items-center gap-1 group shrink-0">
                            <span 
                                className="text-3xl md:text-[34px] font-normal tracking-[0.02em] leading-none" 
                                style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", "Didot", "Bodoni MT", Georgia, serif' }}
                            >
                                <span className="text-foreground">Glow</span>
                                <span style={{ color: '#C2A26A', fontStyle: 'normal', fontWeight: 500 }}>book</span>
                            </span>
                        </Link>

                        {/* Language Selector directly beside Glowbook logo */}
                        <div className="relative">
                            <button
                                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                                aria-label="Byt språk / Change language"
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-foreground/5 transition-all text-foreground/75 hover:text-foreground border border-foreground/15 hover:border-[#C2A26A]/50 shrink-0 h-7"
                            >
                                <span className="text-[11px] font-bold text-foreground/85 uppercase tracking-wider">{currentLang.code}</span>
                                <ChevronDown size={11} className={clsx("transition-transform opacity-50", isLanguageDropdownOpen && "rotate-180")} />
                            </button>

                            {isLanguageDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsLanguageDropdownOpen(false)} />
                                    <div className="absolute left-0 mt-2 w-44 bg-background/95 dark:bg-[#121214]/95 border border-border/80 dark:border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                                        <div className="space-y-0.5">
                                            {LANGUAGES.map((lang) => {
                                                const isSelected = language === lang.id;
                                                return (
                                                    <button
                                                        key={lang.id}
                                                        onClick={() => {
                                                            setLanguage(lang.id);
                                                            setIsLanguageDropdownOpen(false);
                                                        }}
                                                        className={clsx(
                                                            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all",
                                                            isSelected
                                                                ? "bg-[#C2A26A]/15 text-[#C2A26A] font-bold"
                                                                : "text-foreground/75 hover:text-foreground hover:bg-foreground/5 text-xs font-medium"
                                                        )}
                                                    >
                                                        <span className="flex items-center gap-2.5">
                                                            <span className="text-[10px] font-bold tracking-wider text-foreground/40 w-5">{lang.code}</span>
                                                            <span className="text-xs">{lang.label}</span>
                                                        </span>
                                                        {isSelected && <Check size={14} className="text-[#C2A26A] shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Center: Navigation Links (Strictly Centered in Header) */}
                    <nav className="hidden lg:flex items-center justify-center gap-4 xl:gap-6 2xl:gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                        {showLoggedInUI ? (
                            isProviderPortal ? (
                                <>
                                    <NavLink href="/provider" label={t('nav_dashboard')} active={pathname === '/provider'} />
                                    <NavLink href="/provider/customers" label={t('dash_nav_customers')} active={pathname === '/provider/customers'} />
                                    <NavLink href="/provider/services" label={t('dash_nav_services')} active={pathname === '/provider/services'} />
                                    <NavLink href="/provider/settings?tab=inbox" label={t('nav_inbox')} active={pathname === '/provider/settings' && currentTab === 'inbox'} />
                                </>
                            ) : isProvider ? (
                                <>
                                    <NavLink href="/explore" label={t('discover')} active={pathname === '/explore'} />
                                    <NavLink href="/provider" label={t('nav_dashboard')} active={pathname === '/provider'} />
                                    <NavLink href="/provider/settings?tab=inbox" label={t('nav_inbox')} active={pathname === '/provider/settings' && currentTab === 'inbox'} />
                                </>
                            ) : isAdmin ? (
                                <>
                                    <NavLink href="/explore" label={t('discover')} active={pathname === '/explore'} />
                                    <NavLink href="/admin" label="Admin" active={pathname === '/admin'} />
                                    <NavLink href="/support" label={t('nav_support')} active={pathname === '/support'} />
                                </>
                            ) : (
                                <>
                                    <NavLink href="/explore" label={t('discover')} active={pathname === '/explore'} />
                                    <NavLink href="/profile" label={t('my_pages')} active={pathname === '/profile'} />
                                    <NavLink href="/support" label={t('nav_support')} active={pathname === '/support'} />
                                </>
                            )
                        ) : (
                            <>
                                <NavLink href="/explore" label={t('discover')} active={pathname === '/explore'} />
                                <NavLink href="/guides" label={t('nav_guides')} active={pathname === '/guides'} />
                                <NavLink href="/rewards" label={t('nav_rewards')} active={pathname === '/rewards'} />
                                <NavLink href="/giftcards" label={t('nav_giftcards')} active={pathname === '/giftcards'} />
                                <NavLink href="/support" label={t('nav_support')} active={pathname === '/support'} />
                            </>
                        )}
                    </nav>

                    {/* Right side buttons */}
                    <div className="flex items-center gap-2.5 xl:gap-3 shrink-0 z-10 ml-auto">
                        {user?.isImpersonated && (
                            <button
                                onClick={() => {
                                    localStorage.removeItem('glowbook_salon');
                                    sessionStorage.removeItem('glowbook_salon');
                                    window.dispatchEvent(new Event('glowbook_update'));
                                    window.location.href = '/';
                                }}
                                className="hidden md:flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-widest hover:bg-red-600 transition-colors animate-pulse"
                            >
                                <X size={12} /> Avsluta inloggning
                            </button>
                        )}



                        <button
                            onClick={toggleTheme}
                            aria-label="Växla tema"
                            className="p-2 rounded-full hover:bg-foreground/5 transition-colors text-foreground/50 hover:text-[#C2A26A] shrink-0"
                        >
                            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-[#C2A26A]" />}
                        </button>

                        {/* Desktop user menu */}
                        {showLoggedInUI ? (
                            <div className="relative hidden lg:block">
                                <button
                                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                    className="bg-foreground text-background px-4 py-2 rounded-full text-[10px] xl:text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-[#C2A26A] hover:text-[#0B0B0C] transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                    {isProvider ? t('nav_dashboard') : isAdmin ? 'Admin' : t('my_pages')}
                                    <ChevronDown size={12} className={clsx("transition-transform", isUserDropdownOpen && "rotate-180")} />
                                </button>
                                {isUserDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                                        <div className="absolute right-0 mt-3 w-72 bg-card/95 dark:bg-[#141416]/95 backdrop-blur-xl border border-border/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
                                            {/* Integrated Profile Header */}
                                            <div className="flex items-center justify-between gap-3 px-3.5 py-3 mb-1 border-b border-border/60">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">
                                                        {isProvider ? (user?.name || user?.firstName || 'Studio Partner') : isAdmin ? 'Admin' : (user?.firstName || 'Glow Member')}
                                                    </p>
                                                    {user?.email && (
                                                        <p className="text-xs text-foreground/45 truncate">{user.email}</p>
                                                    )}
                                                </div>
                                                <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-[#C2A26A] via-amber-200 to-[#C2A26A] shrink-0">
                                                    <div className="w-full h-full rounded-full overflow-hidden bg-card flex items-center justify-center">
                                                        {user?.profileImage ? (
                                                            <img src={user.profileImage} alt="Profilbild" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={16} strokeWidth={1.6} className="text-[#C2A26A]" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Link
                                                href={isProvider ? "/provider" : isAdmin ? "/admin" : "/profile"}
                                                onClick={() => setIsUserDropdownOpen(false)}
                                                className={clsx(
                                                    "flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-2xl transition-all",
                                                    (pathname === '/provider' || pathname === '/admin' || pathname === '/profile')
                                                        ? "bg-foreground/[0.07] text-foreground font-semibold"
                                                        : "text-foreground/75 hover:text-foreground hover:bg-foreground/[0.04]"
                                                )}
                                            >
                                                <User size={17} strokeWidth={1.6} className="text-foreground/70" />
                                                <span className="flex-1">{isProvider ? t('nav_dashboard') : isAdmin ? 'Admin' : t('my_pages')}</span>
                                            </Link>
                                            {isProvider && (
                                                <Link
                                                    href="/provider/settings"
                                                    onClick={() => setIsUserDropdownOpen(false)}
                                                    className={clsx(
                                                        "flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-2xl transition-all",
                                                        pathname === '/provider/settings'
                                                            ? "bg-foreground/[0.07] text-foreground font-semibold"
                                                            : "text-foreground/75 hover:text-foreground hover:bg-foreground/[0.04]"
                                                    )}
                                                >
                                                    <Settings size={17} strokeWidth={1.6} className="text-foreground/70" />
                                                    <span className="flex-1">{t('nav_settings')}</span>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C2A26A]/15 text-[#C2A26A]">
                                                        {(user?.tier || user?.membership_tier || 'bas').toUpperCase()}
                                                    </span>
                                                </Link>
                                            )}
                                            <div className="h-px bg-border/60 my-1.5 mx-2" />
                                            <button
                                                onClick={() => { setIsUserDropdownOpen(false); logout(); window.location.href = '/auth/login'; }}
                                                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/8 rounded-2xl transition-all"
                                            >
                                                <LogOut size={17} strokeWidth={1.6} />
                                                {t('logout')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="hidden lg:flex items-center gap-2 xl:gap-2.5">
                                <Link
                                    href="/auth/register?role=provider"
                                    className="text-[10px] xl:text-[11px] font-medium tracking-[0.12em] uppercase px-3.5 xl:px-4 py-2 rounded-full border border-[#C2A26A] text-foreground hover:bg-[#C2A26A] hover:text-[#0B0B0C] transition-all duration-300 whitespace-nowrap"
                                >
                                    {t('action_register')}
                                </Link>
                                <Link
                                    href="/auth/login"
                                    className="text-[10px] xl:text-[11px] font-medium tracking-[0.12em] uppercase px-3.5 xl:px-4 py-2 rounded-full bg-foreground/5 hover:bg-foreground hover:text-background border border-foreground/10 transition-all duration-300 whitespace-nowrap"
                                >
                                    {t('action_login')}
                                </Link>
                            </div>
                        )}

                        {/* Mobile hamburger */}
                        <button 
                            className="lg:hidden p-2 text-foreground/80 hover:text-foreground"
                            onClick={() => setIsMobileMenuOpen(true)}
                            aria-label="Öppna meny"
                        >
                            <AlignJustify size={24} />
                        </button>
                    </div>
                </div>
            </header>

            {/* ===== MOBILE FULLSCREEN MENU ===== */}
            {isMobileMenuOpen && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: theme === 'dark' ? '#0B0B0C' : '#F9F9F8' }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                        {/* Top bar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
                            <div className="flex items-center gap-3 relative">
                                <span
                                    className="text-3xl font-normal tracking-[0.02em] leading-none"
                                    style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", "Didot", "Bodoni MT", Georgia, serif', color: theme === 'dark' ? '#F1EFF7' : '#111112' }}
                                >
                                    Glow<span style={{ color: '#C2A26A', fontStyle: 'normal', fontWeight: 500 }}>book</span>
                                </span>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                                        aria-label="Byt språk / Change language"
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-foreground/5 transition-all text-foreground/75 hover:text-foreground border border-foreground/15 hover:border-[#C2A26A]/50 shrink-0 h-7"
                                    >
                                        <span className="text-[11px] font-bold text-foreground/85 uppercase tracking-wider">{currentLang.code}</span>
                                        <ChevronDown size={11} className={clsx("transition-transform opacity-50", isLanguageDropdownOpen && "rotate-180")} />
                                    </button>
                                    {isLanguageDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsLanguageDropdownOpen(false)} />
                                            <div className="absolute left-0 mt-2 w-44 bg-background/95 dark:bg-[#121214]/95 border border-border/80 dark:border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 p-1.5">
                                                <div className="space-y-0.5">
                                                    {LANGUAGES.map((lang) => {
                                                        const isSelected = language === lang.id;
                                                        return (
                                                            <button
                                                                key={lang.id}
                                                                onClick={() => {
                                                                    setLanguage(lang.id);
                                                                    setIsLanguageDropdownOpen(false);
                                                                }}
                                                                className={clsx(
                                                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all",
                                                                    isSelected
                                                                        ? "bg-[#C2A26A]/15 text-[#C2A26A] font-bold"
                                                                        : "text-foreground/75 hover:text-foreground hover:bg-foreground/5 text-xs font-medium"
                                                                )}
                                                            >
                                                                <span className="flex items-center gap-2.5">
                                                                    <span className="text-[10px] font-bold tracking-wider text-foreground/40 w-5">{lang.code}</span>
                                                                    <span className="text-xs">{lang.label}</span>
                                                                </span>
                                                                {isSelected && <Check size={14} className="text-[#C2A26A] shrink-0" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                style={{ width: '44px', height: '44px', borderRadius: '50%', background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`, color: theme === 'dark' ? '#fff' : '#111112', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                aria-label="Stäng meny"
                            >
                                <X size={22} />
                            </button>
                        </div>
                        
                        {/* Menu items */}
                        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="bg-card border border-border/70 rounded-3xl p-2 shadow-[0_12px_36px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
                                {showLoggedInUI && (
                                    <div className="flex items-center justify-between gap-3 px-4 py-3.5 mb-1.5 border-b border-border/60">
                                        <div className="min-w-0">
                                            <p className="text-base font-semibold text-foreground truncate">
                                                {(() => {
                                                    if (isProvider) {
                                                        if (user) {
                                                            const tier = (user.tier || user.membership_tier || 'bas').toLowerCase();
                                                            if (tier === 'luxe') {
                                                                return user.name || 'Studio Luxe';
                                                            }
                                                            return user.firstName || user.name || 'Studio Partner';
                                                        }
                                                        return 'Studio Partner';
                                                    }
                                                    return user?.firstName || 'Glow Member';
                                                })()}
                                            </p>
                                            {user?.email && (
                                                <p className="text-xs text-foreground/45 truncate mt-0.5">{user.email}</p>
                                            )}
                                        </div>
                                        <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-[#C2A26A] via-amber-200 to-[#C2A26A] shrink-0">
                                            <div className="w-full h-full rounded-full overflow-hidden bg-card flex items-center justify-center">
                                                {user?.profileImage ? (
                                                    <img src={user.profileImage} alt="Profilbild" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={18} strokeWidth={1.6} className="text-[#C2A26A]" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-0.5">
                                    {[
                                        ...(showLoggedInUI ? (
                                            isProviderPortal ? [
                                                { href: "/provider", icon: Calendar, label: t('nav_dashboard') },
                                                { href: "/provider/customers", icon: Users, label: t('dash_nav_customers') },
                                                { href: "/provider/services", icon: Scissors, label: t('dash_nav_services') },
                                                { href: "/provider/settings?tab=inbox", icon: MessageSquare, label: t('nav_inbox') },
                                                { href: "/provider/settings", icon: Settings, label: t('nav_settings'), dividerBefore: true, badge: (user?.tier || user?.membership_tier || 'bas').toUpperCase() },
                                            ] : isProvider ? [
                                                { href: "/provider", icon: User, label: t('nav_dashboard') },
                                                { href: "/explore", icon: Compass, label: t('discover') },
                                                { href: "/provider/settings?tab=inbox", icon: MessageSquare, label: t('nav_inbox') },
                                                { href: "/provider/settings", icon: Settings, label: t('nav_settings'), dividerBefore: true, badge: (user?.tier || user?.membership_tier || 'bas').toUpperCase() },
                                            ] : isAdmin ? [
                                                { href: "/admin", icon: User, label: 'Admin' },
                                                { href: "/explore", icon: Compass, label: t('discover') },
                                                { href: "/support", icon: HelpCircle, label: t('nav_support'), dividerBefore: true },
                                            ] : [
                                                { href: "/profile", icon: User, label: t('my_pages') },
                                                { href: "/explore", icon: Compass, label: t('discover') },
                                                { href: "/support", icon: HelpCircle, label: t('nav_support'), dividerBefore: true },
                                            ]
                                        ) : [
                                            { href: "/explore", icon: Compass, label: t('discover') },
                                            { href: "/guides", icon: BookOpen, label: t('nav_guides') },
                                            { href: "/rewards", icon: Star, label: t('nav_rewards') },
                                            { href: "/giftcards", icon: Ticket, label: t('nav_giftcards') },
                                            { href: "/support", icon: HelpCircle, label: t('nav_support'), dividerBefore: true },
                                        ])
                                    ].map((item: any) => {
                                        const isActive = item.href.includes('?tab=inbox')
                                            ? pathname === '/provider/settings' && currentTab === 'inbox'
                                            : item.href === '/provider/settings'
                                            ? pathname === '/provider/settings' && currentTab !== 'inbox'
                                            : pathname === item.href;
                                        return (
                                            <div key={item.href}>
                                                {item.dividerBefore && <div className="h-px bg-border/60 my-1.5 mx-2" />}
                                                <Link
                                                    href={item.href}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={clsx(
                                                        "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[15px] transition-all",
                                                        isActive
                                                            ? "bg-foreground/[0.07] text-foreground font-semibold"
                                                            : "text-foreground/75 hover:text-foreground hover:bg-foreground/[0.04] font-medium"
                                                    )}
                                                >
                                                    <item.icon size={19} strokeWidth={1.6} className={isActive ? "text-foreground" : "text-foreground/55"} />
                                                    <span className="flex-1">{item.label}</span>
                                                    {item.badge && (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C2A26A]/15 text-[#C2A26A]">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </Link>
                                            </div>
                                        );
                                    })}

                                    {showLoggedInUI && (
                                        <>
                                            <div className="h-px bg-border/60 my-1.5 mx-2" />
                                            <button
                                                onClick={() => { setIsMobileMenuOpen(false); logout(); window.location.href = '/auth/login'; }}
                                                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[15px] font-medium text-red-500 hover:bg-red-500/8 transition-all text-left"
                                            >
                                                <LogOut size={19} strokeWidth={1.6} />
                                                <span>{t('logout')}</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {!showLoggedInUI && (
                                <div className="flex flex-col gap-3 pt-1">
                                    <Link
                                        href="/auth/register?role=provider"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-[#C2A26A] text-foreground text-sm font-semibold transition-all hover:bg-[#C2A26A]/10"
                                    >
                                        <Star size={16} strokeWidth={1.6} className="text-[#C2A26A]" /> {t('action_register')}
                                    </Link>
                                    <Link
                                        href="/auth/login"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-foreground text-background text-sm font-semibold transition-all"
                                    >
                                        <User size={16} strokeWidth={1.6} /> {t('action_login')}
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Bottom */}
                        <div style={{ padding: '20px', borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
                            <LocationSelector dark={theme === 'dark'} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
