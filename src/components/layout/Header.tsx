'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Compass, BookOpen, Star, Ticket, HelpCircle, 
    AlignJustify, Sun, Moon, Calendar, User, Settings, 
    Users, Scissors, ChevronDown, MessageSquare, X 
} from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import LocationSelector from '@/components/LocationSelector';
import { useAuth } from '@/hooks/useAuth';

const NavLink = ({ href, label, active }: { href: string; label: string; active?: boolean }) => (
    <Link
        href={href}
        className={clsx(
            "relative text-[12px] xl:text-[13px] font-medium tracking-[0.14em] uppercase transition-colors duration-200 py-1 shrink-0",
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
    const { t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const { isLoggedIn, isSalonOwner, isPractitioner: isPractitionerRole, logout, user } = useAuth();
    const isProvider = isSalonOwner || isPractitionerRole;
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                    {/* Left: Logo & Location */}
                    <div className="flex items-center gap-6 z-10">
                        <Link href="/" className="flex items-center gap-1 group shrink-0">
                            <span 
                                className="text-3xl md:text-[34px] font-normal tracking-[0.02em] leading-none" 
                                style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", "Didot", "Bodoni MT", Georgia, serif' }}
                            >
                                <span className="text-foreground">Glow</span>
                                <span style={{ color: '#C2A26A', fontStyle: 'normal', fontWeight: 500 }}>book</span>
                            </span>
                        </Link>

                        {/* Location - desktop wide screens */}
                        <LocationSelector dark={theme === 'dark'} className="hidden 2xl:flex" />
                    </div>

                    {/* Center: Navigation Links (Perfectly centered on the viewport/container) */}
                    <nav className="hidden lg:flex items-center gap-8 xl:gap-10 absolute left-1/2 -translate-x-1/2">
                        {showLoggedInUI ? (
                            isProviderPortal ? (
                                <>
                                    <NavLink href="/provider" label={t('nav_dashboard')} active={pathname === '/provider'} />
                                    <NavLink href="/provider/customers" label={t('dash_nav_customers')} active={pathname === '/provider/customers'} />
                                    <NavLink href="/provider/services" label={t('dash_nav_services')} active={pathname === '/provider/services'} />
                                    <NavLink href="/provider/settings?tab=inbox" label={t('nav_inbox')} active={pathname?.includes('tab=inbox')} />
                                </>
                            ) : isProvider ? (
                                <>
                                    <NavLink href="/explore" label={t('discover')} active={pathname === '/explore'} />
                                    <NavLink href="/provider" label="Översikt" active={pathname === '/provider'} />
                                    <NavLink href="/provider/settings?tab=inbox" label={t('nav_inbox')} active={pathname?.includes('tab=inbox')} />
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
                    <div className="flex items-center gap-4 md:gap-5 shrink-0">
                        {user?.isImpersonated && (
                            <button
                                onClick={() => {
                                    localStorage.removeItem('glowbook_salon');
                                    sessionStorage.removeItem('glowbook_salon');
                                    window.dispatchEvent(new Event('glowbook_update'));
                                    window.location.href = '/';
                                }}
                                className="hidden md:flex items-center gap-2 bg-red-500 text-white px-3.5 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-widest hover:bg-red-600 transition-colors animate-pulse"
                            >
                                <X size={12} /> Avsluta inloggning
                            </button>
                        )}

                        <button
                            onClick={toggleTheme}
                            aria-label="Växla tema"
                            className="p-2 rounded-full hover:bg-foreground/5 transition-colors text-foreground/50 hover:text-[#C2A26A]"
                        >
                            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} className="text-[#C2A26A]" />}
                        </button>

                        {/* Desktop user menu */}
                        {showLoggedInUI ? (
                            <div className="relative hidden lg:block">
                                <button
                                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                    className="bg-foreground text-background px-5 py-2.5 rounded-full text-[11px] font-medium uppercase tracking-[0.14em] hover:bg-[#C2A26A] hover:text-[#0B0B0C] transition-all flex items-center gap-2 shadow-sm"
                                >
                                    {isProvider ? 'Översikt' : t('my_pages')}
                                    <ChevronDown size={13} className={clsx("transition-transform", isUserDropdownOpen && "rotate-180")} />
                                </button>
                                {isUserDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                                        <div className="absolute right-0 mt-3 w-52 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden z-50 p-2">
                                            <Link
                                                href={isProvider ? "/provider" : "/profile"}
                                                onClick={() => setIsUserDropdownOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/70 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all"
                                            >
                                                <User size={15} style={{ color: '#C2A26A' }} /> {isProvider ? 'Översikt' : t('my_pages')}
                                            </Link>
                                            {isProvider && (
                                                <Link
                                                    href="/provider/settings"
                                                    onClick={() => setIsUserDropdownOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/70 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all"
                                                >
                                                    <Settings size={15} style={{ color: '#C2A26A' }} /> {t('nav_settings')}
                                                </Link>
                                            )}
                                            <div className="h-px bg-border my-1" />
                                            <button
                                                onClick={() => { setIsUserDropdownOpen(false); logout(); window.location.href = '/auth/login'; }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                                            >
                                                <X size={15} /> {t('logout')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="hidden lg:flex items-center gap-3 xl:gap-4">
                                <Link
                                    href="/auth/register?role=provider"
                                    className="text-[11px] xl:text-[12px] font-medium tracking-[0.14em] uppercase px-5 py-2.5 rounded-full border border-[#C2A26A] text-foreground hover:bg-[#C2A26A] hover:text-[#0B0B0C] transition-all duration-300"
                                >
                                    {t('action_register')}
                                </Link>
                                <Link
                                    href="/auth/login"
                                    className="text-[11px] xl:text-[12px] font-medium tracking-[0.14em] uppercase px-5 py-2.5 rounded-full bg-foreground/5 hover:bg-foreground hover:text-background border border-foreground/10 transition-all duration-300"
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
                            <span 
                                className="text-3xl font-normal tracking-[0.02em] leading-none"
                                style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", "Didot", "Bodoni MT", Georgia, serif', color: theme === 'dark' ? '#F1EFF7' : '#111112' }}
                            >
                                Glow<span style={{ color: '#C2A26A', fontStyle: 'normal', fontWeight: 500 }}>book</span>
                            </span>
                            <button 
                                onClick={() => setIsMobileMenuOpen(false)}
                                style={{ width: '44px', height: '44px', borderRadius: '50%', background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`, color: theme === 'dark' ? '#fff' : '#111112', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                aria-label="Stäng meny"
                            >
                                <X size={22} />
                            </button>
                        </div>
                        
                        {/* Menu items */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
                            {showLoggedInUI && (
                                <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '20px', background: 'rgba(194, 162, 106, 0.08)', border: '1px solid rgba(194, 162, 106, 0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#C2A26A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B0B0C' }}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#C2A26A', marginBottom: '2px' }}>Inloggad</p>
                                            <p style={{ fontSize: '16px', fontWeight: 500, color: theme === 'dark' ? '#F1EFF7' : '#111112' }}>
                                                {(() => {
                                                    if (isProvider) {
                                                        if (user) {
                                                            const tier = (user.tier || user.membership_tier || 'bas').toLowerCase();
                                                            if (tier === 'luxe') {
                                                                return user.name || 'Studio Luxe';
                                                            }
                                                            return user.firstName || 'Studio Partner';
                                                        }
                                                        return 'Studio Partner';
                                                    }
                                                    return user?.firstName || 'Glow Member';
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    ...(showLoggedInUI ? (
                                        isProviderPortal ? [
                                            { href: "/provider", icon: Calendar, label: t('nav_dashboard') },
                                            { href: "/provider/customers", icon: Users, label: t('dash_nav_customers') },
                                            { href: "/provider/services", icon: Scissors, label: t('dash_nav_services') },
                                            { href: "/provider/settings?tab=inbox", icon: MessageSquare, label: t('nav_inbox') },
                                            { href: "/provider/settings", icon: Settings, label: t('nav_settings') },
                                        ] : isProvider ? [
                                            { href: "/provider", icon: User, label: 'Översikt' },
                                            { href: "/explore", icon: Compass, label: t('discover') },
                                            { href: "/provider/settings?tab=inbox", icon: MessageSquare, label: t('nav_inbox') },
                                            { href: "/provider/settings", icon: Settings, label: t('nav_settings') },
                                        ] : [
                                            { href: "/profile", icon: User, label: t('my_pages') },
                                            { href: "/explore", icon: Compass, label: t('discover') },
                                            { href: "/support", icon: HelpCircle, label: t('nav_support') },
                                        ]
                                    ) : [
                                        { href: "/explore", icon: Compass, label: t('discover') },
                                        { href: "/guides", icon: BookOpen, label: t('nav_guides') },
                                        { href: "/rewards", icon: Star, label: t('nav_rewards') },
                                        { href: "/giftcards", icon: Ticket, label: t('nav_giftcards') },
                                        { href: "/support", icon: HelpCircle, label: t('nav_support') },
                                    ])
                                ].map((item) => (
                                    <Link 
                                        key={item.href}
                                        href={item.href} 
                                        onClick={() => setIsMobileMenuOpen(false)} 
                                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '16px', color: theme === 'dark' ? '#F1EFF7' : '#111112', fontSize: '14px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)' }}
                                    >
                                        <item.icon size={18} style={{ color: '#C2A26A' }} />
                                        {item.label}
                                    </Link>
                                ))}

                                {!showLoggedInUI && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                        <Link 
                                            href="/auth/register?role=provider" 
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '9999px', border: '1px solid #C2A26A', color: theme === 'dark' ? '#F1EFF7' : '#111112', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', textDecoration: 'none' }}
                                        >
                                            <Star size={15} style={{ color: '#C2A26A' }} /> {t('action_register')}
                                        </Link>
                                        <Link 
                                            href="/auth/login" 
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '9999px', background: theme === 'dark' ? '#F1EFF7' : '#111112', color: theme === 'dark' ? '#0B0B0C' : '#F9F9F8', fontSize: '12px', fontWeight: 600, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.14em' }}
                                        >
                                            <User size={15} /> {t('action_login')}
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {showLoggedInUI && (
                                <button
                                    onClick={() => { setIsMobileMenuOpen(false); logout(); window.location.href = '/auth/login'; }}
                                    style={{ marginTop: '24px', width: '100%', padding: '14px', borderRadius: '16px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                                >
                                    <X size={16} /> {t('logout')}
                                </button>
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
