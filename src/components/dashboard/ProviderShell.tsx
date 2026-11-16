'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { 
    LayoutDashboard, 
    Calendar as CalendarIcon, 
    Users, 
    Scissors, 
    Package, 
    CreditCard, 
    MessageSquare, 
    Megaphone, 
    Gift, 
    Settings, 
    LogOut, 
    Menu, 
    X, 
    ChevronRight,
    ExternalLink,
    ShieldCheck
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export default function ProviderShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const activeTab = searchParams ? searchParams.get('tab') : null;

    const salonName = user?.name || 'Salong';
    
    // Resolve correct membership tier (Luxe By Essi has LUXE membership)
    const rawTier = (user?.membership_tier || user?.tier || (salonName.toLowerCase().includes('luxe') ? 'LUXE' : 'BAS'));
    const tierDisplay = typeof rawTier === 'string' ? rawTier.toUpperCase() : 'LUXE';

    const handleLogout = () => {
        logout();
        router.push('/auth/login');
    };

    const isCurrent = (href: string, tab?: string) => {
        if (tab) {
            return pathname === href.split('?')[0] && activeTab === tab;
        }
        if (href === '/provider') {
            return pathname === '/provider';
        }
        if (href.startsWith('/provider/services')) {
            if (activeTab === 'products') return false;
            return pathname === '/provider/services';
        }
        return pathname.startsWith(href.split('?')[0]);
    };

    const navigationGroups = [
        {
            group: 'DAGLIGT ARBETE',
            items: [
                { name: 'Översikt', href: '/provider', icon: LayoutDashboard, active: isCurrent('/provider') },
                { name: 'Kalender & Schema', href: '/provider/calendar', icon: CalendarIcon, active: isCurrent('/provider/calendar') },
                { name: 'Kunder & Journal', href: '/provider/customers', icon: Users, active: isCurrent('/provider/customers') },
                { name: 'Tjänster & Meny', href: '/provider/services', icon: Scissors, active: isCurrent('/provider/services') },
                { name: 'Produkter & Eftervård', href: '/provider/services?tab=products', icon: Package, active: isCurrent('/provider/services', 'products') },
            ]
        },
        {
            group: 'VERKTYG & EKONOMI',
            items: [
                { name: 'Ekonomi & Utbetalning', href: '/provider/finance', icon: CreditCard, active: isCurrent('/provider/finance') },
                { name: 'Meddelanden & Inkorg', href: '/provider/settings?tab=inbox', icon: MessageSquare, active: isCurrent('/provider/settings', 'inbox') },
                { name: 'Marknadsföring & Länk', href: '/provider/settings?tab=marketing', icon: Megaphone, active: isCurrent('/provider/settings', 'marketing') },
                { name: 'Lojalitet & Rewards', href: '/provider/settings?tab=loyalty', icon: Gift, active: isCurrent('/provider/settings', 'loyalty') },
            ]
        },
        {
            group: 'SYSTEM & PROFIL',
            items: [
                { name: 'Inställningar & Profil', href: '/provider/settings?tab=profile', icon: Settings, active: pathname === '/provider/settings' && (!activeTab || activeTab === 'profile' || activeTab === 'practitioners' || activeTab === 'membership' || activeTab === 'payments' || activeTab === 'notifications' || activeTab === 'templates') },
                { name: 'Visa min bokningssida', href: user?.slug ? `/salon/${user.slug}` : '/', icon: ExternalLink, external: true },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#0B0B0C] text-neutral-100 flex flex-col lg:flex-row antialiased selection:bg-[#C2A26A]/30 selection:text-white">
            
            {/* DESKTOP PERSISTENT SIDEBAR */}
            <aside className="hidden lg:flex w-64 shrink-0 bg-[#0E0E10] border-r border-white/[0.07] min-h-screen flex-col justify-between p-6 sticky top-0 h-screen overflow-y-auto">
                <div className="space-y-8">
                    {/* Glowbook Logo (Pure luxury, no conflicting PRO tag) */}
                    <div className="flex items-center justify-between">
                        <Link href="/provider" className="flex items-center gap-1.5 group">
                            <span 
                                className="text-2xl font-normal tracking-[0.02em] leading-none" 
                                style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif' }}
                            >
                                <span className="text-white">Glow</span>
                                <span style={{ color: '#C2A26A', fontWeight: 500 }}>book</span>
                            </span>
                        </Link>
                    </div>

                    {/* Salon Card (No "Aktiv salong", clean tier badge) */}
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                            <p className="text-xs font-medium text-white truncate">{salonName}</p>
                            <p className="text-[10px] text-neutral-500 mt-0.5">Utförarportal</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase bg-[#C2A26A]/15 text-[#DFCA9B] border border-[#C2A26A]/30 shrink-0">
                            {tierDisplay}
                        </span>
                    </div>

                    {/* Navigation Groups */}
                    <nav className="space-y-6">
                        {navigationGroups.map((group) => (
                            <div key={group.group} className="space-y-1">
                                <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 px-3 mb-2">
                                    {group.group}
                                </h4>
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            target={item.external ? "_blank" : undefined}
                                            className={clsx(
                                                "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group",
                                                item.active
                                                    ? "bg-white/[0.07] text-[#DFCA9B] border border-white/[0.08]"
                                                    : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon 
                                                    size={16} 
                                                    strokeWidth={1.75} 
                                                    className={clsx(
                                                        "transition-colors",
                                                        item.active ? "text-[#C2A26A]" : "text-neutral-500 group-hover:text-neutral-300"
                                                    )} 
                                                />
                                                <span>{item.name}</span>
                                            </div>
                                            {item.active && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#C2A26A]" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Bottom User Area & Logout */}
                <div className="pt-6 border-t border-white/[0.07] space-y-3">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                    >
                        <LogOut size={16} strokeWidth={1.75} className="text-neutral-500" />
                        <span>Logga ut</span>
                    </button>
                </div>
            </aside>

            {/* MOBILE TOP BAR */}
            <header className="lg:hidden sticky top-0 z-40 bg-[#0E0E10]/95 backdrop-blur-xl border-b border-white/[0.08] px-5 py-4 flex items-center justify-between">
                <Link href="/provider" className="flex items-center gap-1.5">
                    <span 
                        className="text-2xl font-normal tracking-[0.02em] leading-none" 
                        style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif' }}
                    >
                        <span className="text-white">Glow</span>
                        <span style={{ color: '#C2A26A', fontWeight: 500 }}>book</span>
                    </span>
                    <span className="ml-1.5 px-2 py-0.5 rounded-full text-[8px] font-semibold tracking-wider uppercase bg-[#C2A26A]/15 text-[#DFCA9B] border border-[#C2A26A]/30">
                        {tierDisplay}
                    </span>
                </Link>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Öppna meny"
                    className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-neutral-300 hover:text-white transition-colors"
                >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </header>

            {/* MOBILE DRAWER */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="lg:hidden fixed inset-0 z-50 bg-[#0E0E10] p-6 flex flex-col justify-between overflow-y-auto"
                    >
                        <div className="space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                                <div>
                                    <p className="text-sm font-medium text-white">{salonName}</p>
                                    <p className="text-[11px] text-neutral-500">Utförarportal</p>
                                </div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    aria-label="Stäng meny"
                                    className="p-2 rounded-xl bg-white/[0.05] text-neutral-400"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <nav className="space-y-6">
                                {navigationGroups.map((group) => (
                                    <div key={group.group} className="space-y-1">
                                        <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 px-3 mb-2">
                                            {group.group}
                                        </h4>
                                        {group.items.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={clsx(
                                                        "flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                                                        item.active
                                                            ? "bg-white/[0.08] text-[#DFCA9B] border border-white/[0.1]"
                                                            : "text-neutral-400 hover:text-white"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Icon size={18} strokeWidth={1.75} className={item.active ? "text-[#C2A26A]" : "text-neutral-500"} />
                                                        <span>{item.name}</span>
                                                    </div>
                                                    <ChevronRight size={16} className="text-neutral-600" />
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ))}
                            </nav>
                        </div>

                        <div className="pt-6 border-t border-white/[0.08]">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] text-neutral-400 text-xs font-medium"
                            >
                                <LogOut size={16} />
                                <span>Logga ut</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN CONTENT OUTLET */}
            <div className="flex-1 min-w-0 bg-[#0B0B0C]">
                {children}
            </div>
        </div>
    );
}
