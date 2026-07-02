
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Search, Compass, BookOpen, Star, Ticket, HelpCircle, 
    AlignJustify, Sun, Moon, Calendar, User, Settings, 
    Users, Scissors, ChevronDown, MessageSquare, X 
} from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import LocationSelector from '@/components/LocationSelector';
import { useAuth } from '@/hooks/useAuth';

const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => (
    <Link
        href={href}
        className="group flex flex-col items-center gap-1.5 transition-all duration-300"
    >
        <div className="flex flex-col items-center gap-1.5">
            <Icon size={16} className="text-foreground/40 group-hover:text-champagne-500 transition-colors" />
            <span className="text-[9px] font-black tracking-[0.1em] uppercase text-foreground/40 group-hover:text-foreground transition-colors">{label}</span>
        </div>
    </Link>
);

export default function Header() {
    const { t, language, setLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const { isLoggedIn, role, isSalonOwner, isPractitioner: isPractitionerRole, logout, user } = useAuth();
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
                className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between border-b border-black/5 dark:border-white/10 bg-background/80 dark:bg-black/80 px-6 md:px-12 backdrop-blur-md"
            >
                {/* Logo */}
                <div className="flex items-center gap-4 md:gap-10 flex-1">
                    <Link href="/" className="flex items-center gap-1 group shrink-0">
                        <h1 className="font-heading text-lg md:text-xl font-black tracking-[-0.04em]">
                            <span className="text-foreground">Glow</span>
                            <span className="text-champagne-500">book</span>
                        </h1>
                    </Link>

                    {/* Location - desktop only */}
                    <LocationSelector dark={theme === 'dark'} className="hidden xl:flex" />
                </div>

                {/* Nav - Center (Desktop only) */}
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
                                <NavItem href="/explore" icon={Compass} label={t('discover')} />
                                <NavItem href="/provider" icon={User} label="Översikt" />
                                <NavItem href="/provider/settings?tab=inbox" icon={MessageSquare} label={t('nav_inbox')} />
                            </>
                        ) : (
                            <>
                                <NavItem href="/explore" icon={Compass} label={t('discover')} />
                                <NavItem href="/profile" icon={User} label={t('my_pages')} />
                                <NavItem href="/support" icon={HelpCircle} label={t('nav_support')} />
                            </>
                        )
                    ) : (
                        <>
                            <NavItem href="/explore" icon={Compass} label={t('discover')} />
                            <NavItem href="/guides" icon={BookOpen} label={t('nav_guides')} />
                            <NavItem href="/rewards" icon={Star} label={t('nav_rewards')} />
                            <NavItem href="/giftcards" icon={Ticket} label={t('nav_giftcards')} />
                            <NavItem href="/support" icon={HelpCircle} label={t('nav_support')} />
                        </>
                    )}
                </nav>

                {/* Right side buttons */}
                <div className="flex items-center justify-end gap-4 md:gap-8 flex-1">
                    {user?.isImpersonated && (
                        <button
                            onClick={() => {
                                localStorage.removeItem('glowbook_salon');
                                sessionStorage.removeItem('glowbook_salon');
                                window.dispatchEvent(new Event('glowbook_update'));
                                window.location.href = '/admin';
                            }}
                            className="hidden md:flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors animate-pulse"
                        >
                            <X size={12} /> Avsluta inloggning
                        </button>
                    )}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-foreground/5 transition-colors text-foreground/40 hover:text-foreground"
                    >
                        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-yellow-400" />}
                    </button>

                    {/* Desktop user menu */}
                    {showLoggedInUI ? (
                        <div className="relative hidden lg:block">
                            <button
                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                className="bg-foreground text-background px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-champagne-500 hover:text-white transition-all shadow-md flex items-center gap-2"
                            >
                                {isProvider ? 'Översikt' : t('my_pages')}
                                <ChevronDown size={12} className={clsx("transition-transform", isUserDropdownOpen && "rotate-180")} />
                            </button>
                            {isUserDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                                    <div className="absolute right-0 mt-3 w-48 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden z-50 p-2">
                                        <Link href={isProvider ? "/provider" : "/profile"} onClick={() => setIsUserDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all">
                                            <User size={14} /> {isProvider ? 'Översikt' : t('my_pages')}
                                        </Link>
                                        {isProvider && (
                                            <Link href="/provider/settings" onClick={() => setIsUserDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all">
                                                <Settings size={14} /> {t('nav_settings')}
                                            </Link>
                                        )}
                                        <div className="h-px bg-border my-1" />
                                        <button onClick={() => { setIsUserDropdownOpen(false); logout(); window.location.href = '/auth/login'; }} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 rounded-xl transition-all">
                                            <Star size={14} /> {t('logout')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="hidden lg:flex items-center gap-8">
                            <Link href="/auth/register?role=provider" className="text-foreground/40 text-[9px] font-black uppercase tracking-widest hover:text-foreground transition-colors">
                                {t('action_register')}
                            </Link>
                            <Link href="/auth/login" className="bg-foreground/5 text-foreground border border-foreground/10 px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all">
                                {t('action_login')}
                            </Link>
                        </div>
                    )}

                    {/* Mobile hamburger */}
                    <button 
                        className="lg:hidden p-2 text-foreground"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <AlignJustify size={24} />
                    </button>
                </div>
            </header>

            {/* ===== MOBILE FULLSCREEN MENU ===== */}
            {isMobileMenuOpen && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: theme === 'dark' ? '#000' : '#F9F7F2' }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                        {/* Top bar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                            <span style={{ fontFamily: 'var(--font-comfortaa)', fontWeight: 900, fontSize: '20px', color: theme === 'dark' ? '#fff' : '#1A1A1A' }}>
                                Glow<span style={{ color: '#C5B358' }}>book</span>
                            </span>
                            <button 
                                onClick={() => setIsMobileMenuOpen(false)}
                                style={{ width: '48px', height: '48px', borderRadius: '16px', background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, color: theme === 'dark' ? '#fff' : '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                <X size={28} />
                            </button>
                        </div>
                        
                        {/* Menu items */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
                            {showLoggedInUI && (
                                <div style={{ marginBottom: '32px', padding: '24px', borderRadius: '24px', background: 'rgba(197,179,88,0.1)', border: '1px solid rgba(197,179,88,0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#C5B358', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#C5B358', marginBottom: '4px' }}>Inloggad</p>
                                            <p style={{ fontSize: '18px', fontWeight: 700, color: theme === 'dark' ? '#fff' : '#1A1A1A' }}>
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
                                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', borderRadius: '20px', color: theme === 'dark' ? '#fff' : '#1A1A1A', fontSize: '18px', fontWeight: 700, textDecoration: 'none', border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}
                                    >
                                        <item.icon size={22} style={{ color: '#C5B358' }} />
                                        {item.label}
                                    </Link>
                                ))}

                                {!showLoggedInUI && (
                                    <>
                                        <Link 
                                            href="/auth/register?role=provider" 
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '18px', borderRadius: '20px', background: '#C5B358', color: '#fff', fontSize: '16px', fontWeight: 900, textDecoration: 'none', marginTop: '16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                        >
                                            <Star size={18} /> Starta Studio
                                        </Link>
                                        <Link 
                                            href="/auth/login" 
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '18px', borderRadius: '20px', background: theme === 'dark' ? '#fff' : '#1A1A1A', color: theme === 'dark' ? '#000' : '#fff', fontSize: '16px', fontWeight: 900, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                        >
                                            <User size={18} /> {t('action_login')}
                                        </Link>
                                    </>
                                )}
                            </div>

                            {showLoggedInUI && (
                                <button
                                    onClick={() => { setIsMobileMenuOpen(false); logout(); window.location.href = '/auth/login'; }}
                                    style={{ marginTop: '32px', width: '100%', padding: '18px', borderRadius: '20px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}
                                >
                                    <X size={18} /> {t('logout')}
                                </button>
                            )}
                        </div>

                        {/* Bottom */}
                        <div style={{ padding: '20px', borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                            <LocationSelector dark={theme === 'dark'} />
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}
