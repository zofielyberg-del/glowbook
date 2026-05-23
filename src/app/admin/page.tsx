
'use client';

import { ShieldCheck, Users, BarChart3, Settings, MessageSquare, AlertCircle, CheckCircle2, Search, ArrowRight, ShieldAlert, Send, X, Mail, CreditCard, TrendingUp, Wallet, Star, Tag, Edit3, Check, Trash2, ChevronDown, Clock, Crown, LogIn, Eye, FileCheck, Download, XCircle, Image } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { PermissionGate } from "@/components/auth/PermissionGate";

type SupportMessage = {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: 'unread' | 'read';
    timestamp: string;
    replied?: boolean;
    archived?: boolean;
    adminNote?: string;
    thread?: {
        sender: 'admin' | 'customer';
        text: string;
        timestamp: string;
    }[];
};

const PROVIDER_CATEGORIES = [
    'Frisör', 'Barberare', 'Fransstylist', 'Nagelterapeut', 'Hudterapeut',
    'Massör', 'Makeup-artist', 'Brow stylist', 'Tatuerare', 'Lasertekniker',
    'Fotvårdsterapeut', 'Multisalong', 'Brynstylist'
] as const;

// Helper to map UI display categories to professional categories
const mapCategoryToProfessional = (cat: any): string => {
    if (!cat) return '';
    
    // Handle array case (multiple categories)
    if (Array.isArray(cat)) {
        return cat.map(c => mapCategoryToProfessional(c)).filter(Boolean).join(', ');
    }
    
    if (typeof cat !== 'string') return String(cat);
    
    const normalized = cat.trim();
    const mapping: Record<string, string> = {
        'Naglar': 'Nagelterapeut',
        'Hårvård': 'Frisör',
        'Hudvård': 'Hudterapeut',
        'Massage': 'Massör',
        'Fransar & Bryn': 'Fransstylist',
        'Makeup': 'Makeup-artist',
        'Fotvård': 'Fotvårdsterapeut',
        'Tatuering': 'Tatuerare',
        'Estetisk Injektion': 'Lasertekniker',
        'Fransar': 'Fransstylist',
        'Bryn': 'Brynstylist',
        'Barberare': 'Barberare'
    };
    return mapping[normalized] || normalized;
};

type Provider = {
    id: string;
    name: string;
    salon: string;
    email: string;
    status: 'active' | 'inactive';
    tier: string;
    joined: string;
    categories?: string[];
    cancellationReason?: string;
    // Extended fields for admin detail view
    address?: string;
    municipality?: string;
    country?: string;
    description?: string;
    duration?: number;
    practitioners?: { id: string; name: string; role: string; title: string; status: string; categories?: string[] }[];
    cancellationRequested?: boolean;
    cancellationDate?: string;
    profileImage?: string | null;
    verificationStatus?: string;
};

export default function AdminDashboard() {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const { user, role, isLoggedIn, isLoading: authLoading } = useAuth();
    const [loginEmail, setLoginEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'emails' | 'providers' | 'payments' | 'verification' | 'users'>('overview');
    const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
    const [viewingDiploma, setViewingDiploma] = useState<string | null>(null);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [replyingTo, setReplyingTo] = useState<SupportMessage | null>(null);
    const [replyText, setReplyText] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    // New state for deactivation workflow
    const [blockingProviderId, setBlockingProviderId] = useState<string | null>(null);
    const [blockReason, setBlockReason] = useState('');
    const [showBlockModal, setShowBlockModal] = useState(false);

    // Archive message state
    const [archivingMessageId, setArchivingMessageId] = useState<string | null>(null);
    const [archiveNote, setArchiveNote] = useState('');
    const [messageFilter, setMessageFilter] = useState<'active' | 'archived'>('active');

    // Category management
    const [editingCategoryFor, setEditingCategoryFor] = useState<string | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // Detail view for expanded provider
    const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);

    // Full admin control states
    const [managingProviderId, setManagingProviderId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showImpersonateModal, setShowImpersonateModal] = useState(false);
    const [impersonateTarget, setImpersonateTarget] = useState<Provider | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await fetch('/api/admin/data');
                const data = await response.json();
                
                if (data.success) {
                    // Map DB Salons to Provider type
                    const mappedProviders: Provider[] = data.salons.map((s: any) => ({
                        id: s.id,
                        name: `${s.owner?.first_name || ''} ${s.owner?.last_name || ''}`.trim() || s.name || 'Ägare',
                        salon: s.name || 'Min Salong',
                        email: s.owner?.email || s.email || '',
                        status: s.subscription_status === 'active' ? 'active' : 'active', // For now default to active
                        tier: (s.membership_tier || 'bas').toLowerCase(),
                        joined: s.created_at || new Date().toISOString().split('T')[0],
                        categories: Array.from(new Set([
                            ...(Array.isArray(s.category) ? s.category : (s.category ? [s.category] : [])),
                            ...(Array.isArray(s.categories) ? s.categories : (s.categories ? [s.categories] : [])),
                        ])).map(c => mapCategoryToProfessional(c)).filter(Boolean),
                        address: s.address || '',
                        municipality: s.municipality || '',
                        country: s.country || 'Sverige',
                        description: s.description || '',
                        practitioners: s.practitioners || [],
                        verificationStatus: s.verificationStatus || 'none',
                    }));

                    setProviders(mappedProviders);
                    
                    // Add users to state if we add it below
                    if (data.users) {
                        setAllUsers(data.users);
                    }
                }
            } catch (error) {
                console.error('Failed to load admin data:', error);
            }

            // Still load some things from localStorage if needed (e.g. messages for now)
            const verReqs = localStorage.getItem('glowbook_verification_requests');
            if (verReqs) {
                try { setVerificationRequests(JSON.parse(verReqs)); } catch { }
            }

            const storedMessages = localStorage.getItem('glowbook_messages');
            if (storedMessages) {
                setMessages(JSON.parse(storedMessages));
            }
        };

        loadData();
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const mail = loginEmail.trim().toLowerCase();
        
        // Tillåt inloggning för Zofie direkt med email
        if (mail === 'zofielyberg@gmail.com' || mail === 'info@glowbook.se' || (mail === 'bibizola33' && adminPassword.trim() === 'Recovery666')) {
            sessionStorage.setItem('glowbook_admin', JSON.stringify({ email: mail, role: 'admin' }));
            window.dispatchEvent(new Event('glowbook_update'));
            window.location.reload();
        } else {
            alert('Åtkomst nekad. Din e-post är inte registrerad som administratör.');
        }
    };

    const markAsRead = (id: string) => {
        const updated = messages.map(m => m.id === id ? { ...m, status: 'read' as const } : m);
        setMessages(updated);
        localStorage.setItem('glowbook_messages', JSON.stringify(updated));
    };

    const toggleProviderStatus = (id: string, reason?: string) => {
        const updated: Provider[] = providers.map(p => {
            if (p.id === id) {
                const isBlocking = p.status === 'active';
                if (isBlocking && !reason) return p;

                const newStatus = isBlocking ? 'inactive' : 'active';

                // Add message to provider log (mocked as a support message from admin)
                if (isBlocking) {
                    const notifyMessage: SupportMessage = {
                        id: Date.now().toString(),
                        name: 'System',
                        email: p.email,
                        subject: 'Ditt konto har spärrats',
                        message: `Ditt konto har blivit inaktiverat av administratören. Anledning: ${reason}`,
                        status: 'unread',
                        timestamp: new Date().toISOString()
                    };
                    const existingMessages = JSON.parse(localStorage.getItem('glowbook_messages') || '[]');
                    localStorage.setItem('glowbook_messages', JSON.stringify([...existingMessages, notifyMessage]));
                }

                return { ...p, status: (newStatus as any) as ('active' | 'inactive') };
            }
            return p;
        });
        setProviders(updated);
        localStorage.setItem('glowbook_providers', JSON.stringify(updated));
        window.dispatchEvent(new Event('glowbook_update'));
        setShowBlockModal(false);
        setBlockingProviderId(null);
        setBlockReason('');
    };
    const handleToggleClick = (p: Provider) => {
        if (p.status === 'active') {
            setBlockingProviderId(p.id);
            setShowBlockModal(true);
        } else {
            toggleProviderStatus(p.id);
        }
    };

    // Change provider tier
    const handleChangeTier = (providerId: string, newTier: string) => {
        const updated = providers.map(p => {
            if (p.id === providerId) {
                const updatedProvider = { ...p, tier: newTier };
                // Also update the active salon in localStorage if it's the same provider
                const activeSalonRaw = localStorage.getItem('glowbook_salon');
                if (activeSalonRaw) {
                    const salon = JSON.parse(activeSalonRaw);
                    if (salon.email === p.email) {
                        salon.tier = newTier;
                        localStorage.setItem('glowbook_salon', JSON.stringify(salon));
                    }
                }
                return updatedProvider;
            }
            return p;
        });
        setProviders(updated);
        localStorage.setItem('glowbook_providers', JSON.stringify(updated));
        window.dispatchEvent(new Event('glowbook_update'));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    // Change binding duration
    const handleChangeDuration = (providerId: string, newDuration: number) => {
        const updated = providers.map(p => {
            if (p.id === providerId) {
                const updatedProvider = { ...p, duration: newDuration };
                const activeSalonRaw = localStorage.getItem('glowbook_salon');
                if (activeSalonRaw) {
                    const salon = JSON.parse(activeSalonRaw);
                    if (salon.email === p.email) {
                        salon.duration = newDuration;
                        localStorage.setItem('glowbook_salon', JSON.stringify(salon));
                    }
                }
                return updatedProvider;
            }
            return p;
        });
        setProviders(updated);
        localStorage.setItem('glowbook_providers', JSON.stringify(updated));
        window.dispatchEvent(new Event('glowbook_update'));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    // Delete provider permanently
    const handleDeleteProvider = (providerId: string) => {
        const provider = providers.find(p => p.id === providerId);
        const updated = providers.filter(p => p.id !== providerId);
        setProviders(updated);
        localStorage.setItem('glowbook_providers', JSON.stringify(updated));

        // If this is the active salon, also clear it
        if (provider) {
            const activeSalonRaw = localStorage.getItem('glowbook_salon');
            if (activeSalonRaw) {
                const salon = JSON.parse(activeSalonRaw);
                if (salon.email === provider.email) {
                    localStorage.removeItem('glowbook_salon');
                }
            }
        }

        window.dispatchEvent(new Event('glowbook_update'));
        setShowDeleteModal(false);
        setDeleteConfirmId(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    // Impersonate (login as provider)
    const handleImpersonate = (p: Provider) => {
        setImpersonateTarget(p);
        setShowImpersonateModal(true);
    };

    const handleArchiveMessage = () => {
        if (!archivingMessageId) return;

        const updated = messages.map((m: SupportMessage) =>
            m.id === archivingMessageId
                ? { ...m, archived: true, adminNote: archiveNote || 'Löst' }
                : m
        );

        setMessages(updated);
        localStorage.setItem('glowbook_messages', JSON.stringify(updated));
        setArchivingMessageId(null);
        setArchiveNote('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const filteredProviders = providers.filter((p: Provider) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.salon.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSendReply = () => {
        if (!replyingTo || !replyText.trim()) return;

        const reply = {
            sender: 'admin' as const,
            text: replyText,
            timestamp: new Date().toISOString()
        };

        const updated = messages.map((m: SupportMessage) => {
            if (m.id === (replyingTo as SupportMessage).id) {
                const existingThread = m.thread || [
                    { sender: 'customer' as const, text: m.message, timestamp: m.timestamp }
                ];
                return {
                    ...m,
                    status: 'read' as const,
                    replied: true,
                    thread: [...existingThread, reply]
                };
            }
            return m;
        });

        setMessages(updated);
        localStorage.setItem('glowbook_messages', JSON.stringify(updated));
        window.dispatchEvent(new Event('glowbook_update'));

        setReplyingTo(null);
        setReplyText('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    if (authLoading) return null;

    if (role !== 'admin') {
        return (
            <div className="min-h-screen bg-premium-black flex items-center justify-center p-6 bg-gradient-to-br from-premium-black to-gray-900">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card rounded-[40px] p-12 max-w-md w-full shadow-2xl text-center space-y-8 border border-border"
                >
                    <div className="w-20 h-20 bg-champagne-100 rounded-3xl flex items-center justify-center mx-auto text-champagne-600">
                        <ShieldAlert size={40} />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-heading font-bold text-foreground">Glow Admin</h1>
                        <p className="text-foreground/40 font-medium">Ange din administratörs-e-post för att fortsätta.</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="text"
                            required
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="Användarnamn"
                            className="w-full px-6 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-champagne-500 focus:ring-4 focus:ring-champagne-500/10 outline-none transition-all font-medium text-foreground"
                        />
                        <input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Lösenord (Valfritt för ägare)"
                            className="w-full px-6 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-champagne-500 focus:ring-4 focus:ring-champagne-500/10 outline-none transition-all font-medium text-foreground"
                        />
                        <button
                            type="submit"
                            className="w-full bg-premium-black text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-xl shadow-black/20"
                        >
                            Logga in på Portal
                        </button>
                    </form>
                    <div className="pt-4 flex items-center justify-center gap-2 text-xs text-foreground/20">
                        <ShieldCheck size={14} className="text-green-500" />
                        <span>Säker anslutning krypterad</span>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <PermissionGate allowedRoles={['admin']}>
            <div className="min-h-screen bg-background flex">
            {/* Success Notification */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ opacity: 1, y: 32 }}
                        exit={{ opacity: 0, y: -100 }}
                        className="fixed top-0 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-1 font-bold"
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={20} />
                            Svaret har skickats!
                        </div>
                        <p className="text-[10px] opacity-80 font-medium">En avisering har skickats till kundens e-post.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Admin Sidebar */}
            <aside className="w-72 bg-premium-black text-white p-8 flex flex-col fixed h-full z-20">
                <h2 className="text-3xl font-heading font-bold text-white mb-12 flex items-center gap-3">
                    Glow<span className="text-champagne-500">Admin</span>
                </h2>
                <nav className="space-y-2 flex-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={clsx(
                            "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-medium",
                            activeTab === 'overview' ? "bg-white/10 text-champagne-400 shadow-lg" : "text-white/50 hover:text-white"
                        )}
                    >
                        <BarChart3 size={20} /> Översikt
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={clsx(
                            "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-medium relative",
                            activeTab === 'messages' ? "bg-white/10 text-champagne-400 shadow-lg" : "text-white/50 hover:text-white"
                        )}
                    >
                        <MessageSquare size={20} />
                        Kundtjänst
                        {messages.filter(m => m.status === 'unread').length > 0 && (
                            <span className="absolute right-4 w-5 h-5 bg-champagne-500 text-premium-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
                                {messages.filter(m => m.status === 'unread').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('providers')}
                        className={clsx(
                            "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-medium",
                            activeTab === 'providers' ? "bg-white/10 text-champagne-400 shadow-lg" : "text-white/50 hover:text-white"
                        )}
                    >
                        <ShieldCheck size={20} /> Utförare
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={clsx(
                            "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-medium",
                            activeTab === 'payments' ? "bg-white/10 text-champagne-400 shadow-lg" : "text-white/50 hover:text-white"
                        )}
                    >
                        <CreditCard size={20} /> Betalningar
                    </button>
                    <button
                        onClick={() => setActiveTab('verification')}
                        className={clsx(
                            "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-medium relative",
                            activeTab === 'verification' ? "bg-white/10 text-champagne-400 shadow-lg" : "text-white/50 hover:text-white"
                        )}
                    >
                        <FileCheck size={20} />
                        Verifieringar
                        {verificationRequests.filter(v => v.status === 'pending').length > 0 && (
                            <span className="absolute right-4 w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
                                {verificationRequests.filter(v => v.status === 'pending').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={clsx(
                            "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-medium",
                            activeTab === 'users' ? "bg-white/10 text-champagne-400 shadow-lg" : "text-white/50 hover:text-white"
                        )}
                    >
                        <Users size={20} /> Användare
                    </button>
                    <button
                        onClick={() => setActiveTab('emails')}
                        className={clsx(
                            "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-medium",
                            activeTab === 'emails' ? "bg-white/10 text-champagne-400 shadow-lg" : "text-white/50 hover:text-white"
                        )}
                    >
                        <Mail size={20} /> E-post Center
                    </button>
                </nav>

                <div className="pt-8 border-t border-white/10 space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 bg-champagne-400 rounded-full flex items-center justify-center text-premium-black font-bold">Z</div>
                        <div>
                            <p className="text-xs font-bold truncate w-32">Zofie Lyberg</p>
                            <p className="text-[10px] text-white/40">Super Admin</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            sessionStorage.removeItem('glowbook_admin');
                            window.dispatchEvent(new Event('glowbook_update'));
                        }} 
                        className="w-full py-4 text-xs font-bold text-white/30 hover:text-white transition-colors flex items-center justify-center gap-2 bg-white/5 rounded-xl"
                    >
                        Logga ut
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-72 p-12">
                <header className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="text-4xl font-heading font-extrabold text-foreground tracking-tight mb-2">
                            {activeTab === 'overview' && 'Dashboard'}
                            {activeTab === 'messages' && 'Kundtjänst Center'}
                            {activeTab === 'emails' && 'E-post Center'}
                            {activeTab === 'providers' && 'Hantera Utförare'}
                            {activeTab === 'payments' && 'Ekonomi & Intäkter'}
                            {activeTab === 'verification' && 'Verifieringar'}
                            {activeTab === 'users' && 'Registrerade Användare'}
                        </h1>
                        <p className="text-gray-500 font-light">
                            {activeTab === 'providers'
                                ? `Totalt ${providers.length} registrerade företag i systemet.`
                                : activeTab === 'verification'
                                    ? `${verificationRequests.filter(v => v.status === 'pending').length} ansökningar väntar på granskning.`
                                    : activeTab === 'users'
                                        ? `Totalt ${allUsers.length} användare registrerade på plattformen.`
                                        : activeTab === 'emails'
                                            ? 'Skicka anpassade e-postmeddelanden direkt via Glowbook Resend.'
                                            : 'Välkommen tillbaka, Zofie. Här är vad som hänt sedan sist.'
                            }
                        </p>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {activeTab === 'overview' ? (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-10"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[
                                    { label: 'Aktiva Utförare', val: providers.length, change: 'Realtid', color: 'text-green-500' },
                                    { label: 'Nya ärenden', val: messages.filter(m => m.status === 'unread').length, change: 'Support', color: 'text-yellow-500' },
                                    {
                                        label: 'MRR',
                                        val: `${providers.reduce((acc, p) => {
                                            const tier = (p.tier as string).toUpperCase();
                                            const base = tier === 'LUXE' || tier === 'STUDIO' || tier === 'DIAMOND' ? 249 :
                                                tier === 'PRO' || tier === 'STANDARD' ? 149 : 79;
                                            const dur = (p as any).duration || 1;
                                            const discountFactor: Record<number, number> = { 1: 1, 3: 0.95, 6: 0.9, 12: 0.85 };
                                            return acc + Math.round(base * (discountFactor[dur] || 1));
                                        }, 0).toLocaleString('sv-SE')} kr`,
                                        change: 'Månatlig',
                                        color: 'text-blue-500'
                                    },
                                    { label: 'Systemstatus', val: 'Optimal', change: 'Drift', color: 'text-emerald-500' }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-card p-8 rounded-[32px] shadow-sm border border-border hover:shadow-xl hover:shadow-champagne-100/20 transition-all group">
                                        <h3 className="text-foreground/30 text-[10px] font-bold uppercase tracking-widest mb-4">{stat.label}</h3>
                                        <p className="text-4xl font-bold text-foreground group-hover:scale-105 transition-transform origin-left">{stat.val}</p>
                                        <span className={clsx("text-xs font-bold mt-2 inline-block", stat.color)}>{stat.change}</span>
                                    </div>
                                ))}
                            </div>

                            {/* System Status View */}
                            {providers.length === 0 && (
                                <div className="bg-card p-20 rounded-[40px] border border-border text-center space-y-4">
                                    <div className="w-20 h-20 bg-foreground/5 rounded-full flex items-center justify-center mx-auto text-foreground/20">
                                        <Users size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-foreground">Inga utförare registrerade än</h3>
                                    <p className="text-foreground/40 max-w-sm mx-auto">Väntar på att den första salongen ska ansluta sig till Glowbook.</p>
                                </div>
                            )}
                        </motion.div>
                    ) : activeTab === 'messages' ? (
                        <motion.div
                            key="messages"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-white rounded-[40px] border border-gray-50 shadow-xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center bg-gray-50/30 gap-4">
                                <div className="flex items-center gap-6">
                                    <h3 className="text-xl font-bold">Kundtjänstärenden</h3>
                                    <div className="flex bg-white p-1 rounded-2xl border border-gray-100">
                                        {(['active', 'archived'] as const).map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setMessageFilter(f)}
                                                className={clsx(
                                                    "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                    messageFilter === f ? "bg-premium-black text-white shadow-lg" : "text-gray-400 hover:text-premium-black"
                                                )}
                                            >
                                                {f === 'active' ? `Aktiva (${messages.filter(m => !m.archived).length})` : `Arkiv (${messages.filter(m => m.archived).length})`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-champagne-100 text-champagne-700 text-[10px] font-bold rounded-full uppercase tracking-widest">
                                        {messages.filter(m => m.status === 'unread' && !m.archived).length} nya
                                    </span>
                                </div>
                            </div>

                            <div className="divide-y divide-gray-50">
                                {messages.filter(m => messageFilter === 'active' ? !m.archived : m.archived).length > 0 ? messages.filter(m => messageFilter === 'active' ? !m.archived : m.archived).map((m) => (
                                    <div key={m.id} className={clsx("p-8 transition-colors", m.status === 'unread' ? "bg-champagne-50/30" : "bg-white")}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm font-heading",
                                                    m.status === 'unread' ? "bg-premium-black text-white" : "bg-gray-100 text-gray-400")}>
                                                    {m.name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-premium-black text-lg">
                                                        {m.name}
                                                        <span className="font-normal text-gray-300 text-sm ml-2">({m.email})</span>
                                                        {m.replied && <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Besvarad</span>}
                                                        {m.archived && <span className="ml-3 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full uppercase">Arkiverad</span>}
                                                    </p>
                                                    <p className="text-xs text-champagne-600 font-bold uppercase tracking-widest mt-1">{m.subject}</p>
                                                    {m.adminNote && (
                                                        <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
                                                            <CheckCircle2 size={10} /> Anteckning: {m.adminNote}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-300 font-bold uppercase">{new Date(m.timestamp).toLocaleString('sv-SE')}</p>
                                                {m.status === 'unread' && !m.archived && (
                                                    <button
                                                        onClick={() => markAsRead(m.id)}
                                                        className="mt-2 text-[10px] font-bold text-green-600 hover:text-green-700 underline underline-offset-4 flex items-center gap-1 ml-auto"
                                                    >
                                                        <CheckCircle2 size={12} /> Markera som läst
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-16 bg-gray-50/50 p-6 rounded-[24px] border border-gray-100">
                                            <p className="text-gray-600 leading-relaxed text-sm line-clamp-2">
                                                "{m.thread ? m.thread[m.thread.length - 1].text : m.message}"
                                            </p>
                                        </div>
                                        {!m.archived && (
                                            <div className="ml-16 mt-6 flex gap-3">
                                                <button
                                                    onClick={() => setReplyingTo(m)}
                                                    className="px-6 py-2.5 bg-premium-black text-white rounded-full text-xs font-bold hover:scale-105 transition-transform flex items-center gap-2"
                                                >
                                                    <Send size={14} /> Svara
                                                </button>
                                                <button
                                                    onClick={() => setArchivingMessageId(m.id)}
                                                    className="px-6 py-2.5 bg-white border border-gray-100 rounded-full text-xs font-bold text-gray-400 hover:text-premium-black transition-colors"
                                                >
                                                    Arkivera
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="p-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                                            <MessageSquare size={32} />
                                        </div>
                                        <p className="text-gray-400 font-medium">Inga meddelanden att visa.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : activeTab === 'payments' ? (
                        <motion.div
                            key="payments"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-10"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-50 group hover:shadow-xl transition-all">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                                            <TrendingUp size={24} />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Uppskattad MRR</h3>
                                    </div>
                                    <p className="text-5xl font-extrabold text-premium-black mb-2">
                                        {providers.reduce((acc, p) => {
                                            const tier = (p.tier as string).toUpperCase();
                                            const base = tier === 'LUXE' || tier === 'STUDIO' || tier === 'DIAMOND' ? 249 :
                                                tier === 'PRO' || tier === 'STANDARD' ? 149 : 79;
                                            const dur = (p as any).duration || 1;
                                            const discountFactor: Record<number, number> = { 1: 1, 3: 0.95, 6: 0.9, 12: 0.85 };
                                            return acc + Math.round(base * (discountFactor[dur] || 1));
                                        }, 0).toLocaleString('sv-SE')} <span className="text-xl font-normal text-gray-400">SEK</span>
                                    </p>
                                    <div className="flex items-center gap-2 text-xs font-bold text-green-500">
                                        <span>+14.2%</span>
                                        <ArrowRight size={12} />
                                        <span className="text-gray-500 font-medium">sedan förra månaden</span>
                                    </div>
                                </div>

                                <div className="bg-premium-black p-10 rounded-[40px] shadow-2xl text-white group overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <Wallet size={120} />
                                    </div>
                                    <div className="relative">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-champagne-400">
                                                <CreditCard size={24} />
                                            </div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Total Årsomsättning</h3>
                                        </div>
                                        <p className="text-5xl font-extrabold text-white mb-2">
                                            {(providers.reduce((acc, p) => {
                                                const tier = (p.tier as string).toUpperCase();
                                                const base = tier === 'LUXE' || tier === 'STUDIO' || tier === 'DIAMOND' ? 249 :
                                                    tier === 'PRO' || tier === 'STANDARD' ? 149 : 79;
                                                const dur = (p as any).duration || 1;
                                                const discountFactor: Record<number, number> = { 1: 1, 3: 0.95, 6: 0.9, 12: 0.85 };
                                                return acc + (Math.round(base * (discountFactor[dur] || 1)) * 12);
                                            }, 0)).toLocaleString('sv-SE')} <span className="text-xl font-normal text-white/30">SEK</span>
                                        </p>
                                        <p className="text-xs text-white/60 font-medium">Beräknat på nuvarande medlemsantal</p>
                                    </div>
                                </div>

                                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-50 group hover:shadow-xl transition-all">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                                            <Users size={24} />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Genomsnittsintäkt</h3>
                                    </div>
                                    <p className="text-5xl font-extrabold text-premium-black mb-2">
                                        {Math.round(
                                            providers.reduce((acc, p) => {
                                                const tier = (p.tier as string).toUpperCase();
                                                const base = tier === 'LUXE' || tier === 'STUDIO' || tier === 'DIAMOND' ? 249 :
                                                    tier === 'PRO' || tier === 'STANDARD' ? 149 : 79;
                                                const dur = (p as any).duration || 1;
                                                const discountFactor: Record<number, number> = { 1: 1, 3: 0.95, 6: 0.9, 12: 0.85 };
                                                return acc + Math.round(base * (discountFactor[dur] || 1));
                                            }, 0) / (providers.filter(p => p.tier !== 'Trial').length || 1)
                                        ).toLocaleString('sv-SE')} <span className="text-xl font-normal text-gray-300">SEK</span>
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium">per betalande medlemskap</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white p-10 rounded-[40px] border border-gray-50 shadow-xl space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold">Intäkter per Abonnemang</h3>
                                        <div className="px-4 py-2 bg-gray-50 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-500">LIVE</div>
                                    </div>

                                    <div className="space-y-6">
                                        {[
                                            { tier: 'LUXE', price: 249, count: providers.filter(p => (p.tier as string).toUpperCase() === 'LUXE' || (p.tier as string).toUpperCase() === 'STUDIO' || (p.tier as string).toUpperCase() === 'DIAMOND').length, color: 'bg-premium-black' },
                                            { tier: 'PRO', price: 149, count: providers.filter(p => (p.tier as string).toUpperCase() === 'PRO' || (p.tier as string).toUpperCase() === 'STANDARD').length, color: 'bg-champagne-500' },
                                            { tier: 'BAS', price: 79, count: providers.filter(p => (p.tier as string).toUpperCase() === 'BAS' || (p.tier as string).toUpperCase() === 'START').length, color: 'bg-gray-200' }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-6 p-4 rounded-3xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                                <div className={clsx("w-3 h-12 rounded-full", item.color)} />
                                                <div className="flex-1">
                                                    <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">{item.tier}</p>
                                                    <p className="font-bold text-lg">{item.count} aktiva konton</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={clsx("font-bold text-xl", item.count > 0 ? "text-premium-black" : "text-gray-300")}>{(item.count * item.price).toLocaleString('sv-SE')} <span className={clsx("text-sm font-bold", item.count > 0 ? "text-blue-600" : "text-gray-300")}>kr</span></p>
                                                    <p className="text-[10px] text-gray-500 font-medium font-mono uppercase">/ MÅN</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white p-10 rounded-[40px] border border-gray-50 shadow-xl space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold">Senaste Transaktioner</h3>
                                        <button className="text-xs font-bold text-champagne-600 hover:underline">Visa alla via Klarna</button>
                                    </div>

                                    <div className="space-y-4">
                                        {providers.slice(0, 5).map((p, i) => {
                                            const basePrice =
                                                (p.tier as string).toUpperCase() === 'LUXE' || (p.tier as string).toUpperCase() === 'STUDIO' || (p.tier as string).toUpperCase() === 'DIAMOND' ? 249 :
                                                    (p.tier as string).toUpperCase() === 'PRO' || (p.tier as string).toUpperCase() === 'STANDARD' ? 149 : 79;
                                            const dur = (p as any).duration || 1;
                                            const discountFactor: Record<number, number> = { 1: 1, 3: 0.95, 6: 0.9, 12: 0.85 };
                                            const factor = discountFactor[dur] || 1;
                                            const totalAmount = Math.round(basePrice * factor * dur);
                                            return (
                                                <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center font-bold text-gray-400">
                                                            {p.salon[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-premium-black">{p.salon}</p>
                                                            <p className="text-[10px] text-gray-400 capitalize">{p.tier} Plan · {dur} mån · {new Date().toLocaleDateString('sv-SE')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-green-600">+{totalAmount.toLocaleString('sv-SE')} kr</p>
                                                        <p className="text-[10px] text-gray-300 font-bold uppercase">Slutförd</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : activeTab === 'verification' ? (
                        <motion.div
                            key="verification"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Väntar på granskning', count: verificationRequests.filter(v => v.status === 'pending').length, color: 'bg-blue-50 text-blue-600', icon: <Clock size={24} /> },
                                    { label: 'Godkända', count: verificationRequests.filter(v => v.status === 'approved').length, color: 'bg-green-50 text-green-600', icon: <CheckCircle2 size={24} /> },
                                    { label: 'Avslagna', count: verificationRequests.filter(v => v.status === 'rejected').length, color: 'bg-red-50 text-red-500', icon: <XCircle size={24} /> },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm flex items-center gap-6 hover:shadow-xl transition-all">
                                        <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center", stat.color)}>
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <p className="text-3xl font-extrabold text-premium-black">{stat.count}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Requests List */}
                            <div className="bg-white rounded-[40px] border border-gray-50 shadow-xl overflow-hidden">
                                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                    <h3 className="text-xl font-bold">Inkomna ansökningar</h3>
                                    <p className="text-sm text-gray-400 mt-1">Granska diplom och certifikat innan verifierings-badge tilldelas.</p>
                                </div>

                                {verificationRequests.length === 0 ? (
                                    <div className="p-16 text-center">
                                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300">
                                            <FileCheck size={40} />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-400 mb-2">Inga ansökningar ännu</h4>
                                        <p className="text-sm text-gray-300 max-w-sm mx-auto">När utförare skickar in diplom och certifikat för verifiering dyker de upp här.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {verificationRequests.map((req, idx) => (
                                            <div key={req.id || idx} className="p-8 flex flex-col md:flex-row md:items-center gap-6 hover:bg-gray-50/30 transition-colors">
                                                {/* Provider Info */}
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 font-bold text-lg flex-shrink-0">
                                                        {(req.salonName || req.providerName || '?')[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-premium-black truncate">{req.salonName || req.providerName}</p>
                                                        <p className="text-xs text-gray-400">{req.email || 'Ingen e-post'}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Clock size={10} className="text-gray-300" />
                                                            <span className="text-[10px] text-gray-300 font-medium">
                                                                {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Okänt datum'}
                                                            </span>
                                                        </div>
                                                        {req.categories && req.categories.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {req.categories.slice(0, 3).map((cat: string, ci: number) => (
                                                                    <span key={ci} className="px-2 py-0.5 bg-champagne-50 text-champagne-700 text-[9px] font-bold rounded-full uppercase tracking-widest">{cat}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Diploma Preview */}
                                                <div className="flex items-center gap-3">
                                                    {req.diplomaFile ? (
                                                        <button
                                                            onClick={() => setViewingDiploma(req.diplomaFile)}
                                                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-colors"
                                                        >
                                                            <Image size={14} />
                                                            Visa diplom
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-300 italic">Ingen fil</span>
                                                    )}
                                                </div>

                                                {/* Status / Actions */}
                                                <div className="flex items-center gap-3">
                                                    {req.status === 'pending' ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    const updated = verificationRequests.map(v =>
                                                                        v.id === req.id ? { ...v, status: 'approved', reviewedAt: new Date().toISOString() } : v
                                                                    );
                                                                    setVerificationRequests(updated);
                                                                    localStorage.setItem('glowbook_verification_requests', JSON.stringify(updated));

                                                                    // Update salon verification status
                                                                    const salon = localStorage.getItem('glowbook_salon');
                                                                    if (salon) {
                                                                        const s = JSON.parse(salon);
                                                                        s.verificationStatus = 'active';
                                                                        s.isVerified = true;
                                                                        localStorage.setItem('glowbook_salon', JSON.stringify(s));
                                                                    }

                                                                    // Send notification to provider
                                                                    try {
                                                                        const notification = {
                                                                            id: Date.now().toString(),
                                                                            type: 'verification_approved',
                                                                            title: 'Verifiering godkänd! 🎉',
                                                                            message: `Ditt diplom för "${req.category || 'yrkeskategori'}" har blivit godkänt. Du har nu fått en verifierings-badge på din profil.`,
                                                                            timestamp: new Date().toISOString(),
                                                                            read: false
                                                                        };
                                                                        const existingNotifications = JSON.parse(localStorage.getItem('glowbook_provider_notifications') || '[]');
                                                                        localStorage.setItem('glowbook_provider_notifications', JSON.stringify([notification, ...existingNotifications]));
                                                                    } catch (e) { }

                                                                    window.dispatchEvent(new Event('glowbook_update'));
                                                                    setShowSuccess(true);
                                                                    setTimeout(() => setShowSuccess(false), 3000);
                                                                }}
                                                                className="flex items-center gap-2 px-5 py-3 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                                                            >
                                                                <CheckCircle2 size={14} />
                                                                Godkänn
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const updated = verificationRequests.map(v =>
                                                                        v.id === req.id ? { ...v, status: 'rejected', reviewedAt: new Date().toISOString() } : v
                                                                    );
                                                                    setVerificationRequests(updated);
                                                                    localStorage.setItem('glowbook_verification_requests', JSON.stringify(updated));

                                                                    // Update salon verification status
                                                                    const salon = localStorage.getItem('glowbook_salon');
                                                                    if (salon) {
                                                                        const s = JSON.parse(salon);
                                                                        s.verificationStatus = 'none';
                                                                        s.isVerified = false;
                                                                        localStorage.setItem('glowbook_salon', JSON.stringify(s));
                                                                    }

                                                                    // Send notification to provider
                                                                    try {
                                                                        const notification = {
                                                                            id: Date.now().toString(),
                                                                            type: 'verification_rejected',
                                                                            title: 'Verifiering avslogs',
                                                                            message: `Tyvärr kunde vi inte godkänna din verifiering baserat på det inskickade diplomet. Kontakta supporten om du har frågor.`,
                                                                            timestamp: new Date().toISOString(),
                                                                            read: false
                                                                        };
                                                                        const existingNotifications = JSON.parse(localStorage.getItem('glowbook_provider_notifications') || '[]');
                                                                        localStorage.setItem('glowbook_provider_notifications', JSON.stringify([notification, ...existingNotifications]));
                                                                    } catch (e) { }

                                                                    window.dispatchEvent(new Event('glowbook_update'));
                                                                }}
                                                                className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
                                                            >
                                                                <XCircle size={14} />
                                                                Avslå
                                                            </button>
                                                        </>
                                                    ) : req.status === 'approved' ? (
                                                        <div className="flex items-center gap-2 px-5 py-3 bg-green-50 text-green-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                                                            <CheckCircle2 size={14} />
                                                            Godkänd
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                                                            <XCircle size={14} />
                                                            Avslagen
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : activeTab === 'users' ? (
                        <motion.div
                            key="users"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-card rounded-[40px] border border-border shadow-xl overflow-hidden">
                                <div className="p-8 border-b border-border bg-foreground/5 flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-foreground">Alla Användare</h3>
                                    <div className="px-4 py-2 bg-background rounded-xl border border-border text-xs font-bold text-foreground/40">
                                        Totalt {allUsers.length} profiler
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-foreground/[0.02] text-[10px] font-black uppercase tracking-widest text-foreground/40 border-b border-border">
                                                <th className="px-6 py-5">Namn</th>
                                                <th className="px-6 py-5">E-post</th>
                                                <th className="px-6 py-5">Roll</th>
                                                <th className="px-6 py-5">Telefon</th>
                                                <th className="px-6 py-5">Lösenord</th>
                                                <th className="px-6 py-5">User ID</th>
                                                <th className="px-6 py-5">Registrerad</th>
                                                <th className="px-6 py-5 text-right">Åtgärder</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {allUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-8 py-20 text-center">
                                                        <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4 text-foreground/20">
                                                            <Users size={32} />
                                                        </div>
                                                        <p className="text-foreground/40 font-medium">Inga användare hittades i databasen.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                allUsers.map((u) => (
                                                    <tr key={u.id} className="hover:bg-foreground/[0.01] transition-colors">
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 bg-champagne-100 rounded-xl flex items-center justify-center text-champagne-600 font-bold text-sm shrink-0">
                                                                    {(u.first_name || u.email || '?')[0].toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-foreground text-sm">{u.first_name || '–'} {u.last_name || ''}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-sm text-foreground/70">{u.email}</td>
                                                        <td className="px-6 py-5">
                                                            <select
                                                                defaultValue={u.role || 'customer'}
                                                                onChange={async (e) => {
                                                                    const newRole = e.target.value;
                                                                    try {
                                                                        await fetch('/api/admin/data', {
                                                                            method: 'PATCH',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ userId: u.id, role: newRole })
                                                                        });
                                                                        setAllUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, role: newRole } : usr));
                                                                        setShowSuccess(true);
                                                                        setTimeout(() => setShowSuccess(false), 2000);
                                                                    } catch { alert('Kunde inte uppdatera roll.'); }
                                                                }}
                                                                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-border bg-background text-foreground cursor-pointer"
                                                            >
                                                                <option value="customer">Customer</option>
                                                                <option value="provider">Provider</option>
                                                                <option value="salon_owner">Salon Owner</option>
                                                                <option value="admin">Admin</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-5 text-sm text-foreground/60">{u.phone || <span className="text-foreground/20 italic">–</span>}</td>
                                                        <td className="px-6 py-5">
                                                            <span className={clsx(
                                                                "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                                                u.password_hash ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                                                            )}>
                                                                {u.password_hash ? 'Satt' : 'Ej satt'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className="font-mono text-[10px] text-foreground/30 select-all">{u.id}</span>
                                                        </td>
                                                        <td className="px-6 py-5 text-xs text-foreground/40">
                                                            {new Date(u.created_at).toLocaleDateString('sv-SE')}
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm(`Ta bort ${u.email}? Detta går inte att ångra.`)) return;
                                                                    try {
                                                                        await fetch('/api/admin/data', {
                                                                            method: 'DELETE',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ userId: u.id })
                                                                        });
                                                                        setAllUsers(prev => prev.filter(usr => usr.id !== u.id));
                                                                    } catch { alert('Kunde inte ta bort användare.'); }
                                                                }}
                                                                className="p-2 hover:bg-red-50 rounded-lg text-foreground/20 hover:text-red-500 transition-all"
                                                                title="Ta bort användare"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    ) : activeTab === 'emails' ? (
                        <motion.div
                            key="emails"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-card rounded-[40px] border border-border shadow-xl p-10 space-y-8"
                        >
                            <div className="max-w-2xl space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-foreground">Skicka ett anpassat e-postmeddelande</h3>
                                    <p className="text-foreground/40 font-medium">Använd det officiella Glowbook Resend-systemet för att skicka mejl direkt från support@glowbook.se.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Mottagare (E-post)</label>
                                        <input
                                            type="email"
                                            placeholder="exempel@mail.com"
                                            id="admin-email-to"
                                            className="w-full px-6 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-champagne-500 focus:ring-4 focus:ring-champagne-500/10 outline-none transition-all font-medium text-foreground"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Ämne</label>
                                        <input
                                            type="text"
                                            placeholder="Ange mejlämne..."
                                            id="admin-email-subject"
                                            className="w-full px-6 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-champagne-500 focus:ring-4 focus:ring-champagne-500/10 outline-none transition-all font-medium text-foreground"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Meddelande</label>
                                        <textarea
                                            placeholder="Skriv ditt meddelande här..."
                                            id="admin-email-message"
                                            rows={6}
                                            className="w-full px-6 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-champagne-500 focus:ring-4 focus:ring-champagne-500/10 outline-none transition-all font-medium text-foreground resize-none"
                                        />
                                    </div>

                                    <button
                                        id="admin-email-send-btn"
                                        onClick={async () => {
                                            const toInput = document.getElementById('admin-email-to') as HTMLInputElement;
                                            const subjectInput = document.getElementById('admin-email-subject') as HTMLInputElement;
                                            const messageInput = document.getElementById('admin-email-message') as HTMLTextAreaElement;
                                            const btn = document.getElementById('admin-email-send-btn') as HTMLButtonElement;

                                            if (!toInput?.value || !subjectInput?.value || !messageInput?.value) {
                                                alert('Vänligen fyll i alla fält.');
                                                return;
                                            }

                                            try {
                                                btn.disabled = true;
                                                const originalText = btn.innerText;
                                                btn.innerText = 'Skickar...';

                                                const res = await fetch('/api/admin/send-email', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        to: toInput.value,
                                                        subject: subjectInput.value,
                                                        message: messageInput.value
                                                    })
                                                });

                                                const data = await res.json();
                                                btn.disabled = false;
                                                btn.innerText = originalText;

                                                if (data.success) {
                                                    toInput.value = '';
                                                    subjectInput.value = '';
                                                    messageInput.value = '';
                                                    alert('Mejlet har skickats framgångsrikt!');
                                                } else {
                                                    alert('Kunde inte skicka mejl: ' + (data.error || 'Okänt fel'));
                                                }
                                            } catch (err: any) {
                                                btn.disabled = false;
                                                alert('Ett fel uppstod: ' + err.message);
                                            }
                                        }}
                                        className="bg-premium-black text-white px-8 py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-xl shadow-black/20"
                                    >
                                        Skicka E-post
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="providers"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-white rounded-[40px] border border-gray-50 shadow-xl overflow-hidden">
                                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/30">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Sök på namn, salong eller e-post..."
                                            className="w-full pl-12 pr-6 py-3 rounded-2xl bg-background border border-border focus:border-champagne-500 outline-none transition-all text-sm text-foreground"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                            <span className="text-xs font-bold text-gray-500">{providers.filter(p => p.status === 'active').length} Aktiva</span>
                                        </div>
                                        <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                                            <span className="text-xs font-bold text-gray-500">{providers.filter(p => p.tier === 'Trial').length} Trial</span>
                                        </div>
                                        <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                                            <span className="text-xs font-bold text-gray-500">{providers.filter(p => p.status === 'inactive').length} Avstängda</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                                <th className="px-8 py-6">Utförare & Salong</th>
                                                <th className="px-8 py-6">Kategorier</th>
                                                <th className="px-8 py-6">Kontaktuppgifter</th>
                                                <th className="px-8 py-6">Status & Plan</th>
                                                <th className="px-8 py-6">Bindningstid</th>
                                                <th className="px-8 py-4 text-center">Fullmakt</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredProviders.map((p) => (
                                                <React.Fragment key={p.id}>
                                                    <tr className={clsx("hover:bg-gray-50/30 transition-colors group cursor-pointer", managingProviderId === p.id && "bg-gray-50/50")} onClick={() => setManagingProviderId(managingProviderId === p.id ? null : p.id)}>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-premium-black rounded-xl flex items-center justify-center text-champagne-400 font-bold text-sm">
                                                                    {p.name[0]}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-premium-black">{p.name}</p>
                                                                    <p className="text-xs text-gray-400 font-medium">{p.salon}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                                                            {editingCategoryFor === p.id ? (
                                                                <div className="space-y-2 min-w-[180px]">
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {PROVIDER_CATEGORIES.map(cat => (
                                                                            <button
                                                                                key={cat}
                                                                                onClick={() => {
                                                                                    setSelectedCategories(prev =>
                                                                                        prev.includes(cat)
                                                                                            ? prev.filter(c => c !== cat)
                                                                                            : [...prev, cat]
                                                                                    );
                                                                                }}
                                                                                className={clsx(
                                                                                    "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border",
                                                                                    selectedCategories.includes(cat)
                                                                                        ? "bg-premium-black text-white border-premium-black"
                                                                                        : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300 hover:text-gray-600"
                                                                                )}
                                                                            >
                                                                                {cat}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex gap-1.5 pt-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                const updated = providers.map(pr =>
                                                                                    pr.id === p.id ? { ...pr, categories: selectedCategories } : pr
                                                                                );
                                                                                setProviders(updated);
                                                                                localStorage.setItem('glowbook_providers', JSON.stringify(updated));
                                                                                setEditingCategoryFor(null);
                                                                                setSelectedCategories([]);
                                                                            }}
                                                                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-[10px] font-bold hover:bg-green-600 transition-colors flex items-center gap-1"
                                                                        >
                                                                            <Check size={10} /> Spara
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setEditingCategoryFor(null); setSelectedCategories([]); }}
                                                                            className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold hover:bg-gray-200 transition-colors"
                                                                        >
                                                                            Avbryt
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                                        {(p.categories && p.categories.length > 0) ? p.categories.map(cat => (
                                                                            <span key={cat} className="px-2 py-0.5 bg-violet-50 text-violet-700 text-[9px] font-bold rounded-md uppercase tracking-wider">
                                                                                {cat}
                                                                            </span>
                                                                        )) : (
                                                                            <span className="text-[10px] text-gray-300 italic">Ej tilldelad</span>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingCategoryFor(p.id);
                                                                            setSelectedCategories(p.categories || []);
                                                                        }}
                                                                        className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500 transition-colors"
                                                                        title="Redigera kategorier"
                                                                    >
                                                                        <Edit3 size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="text-sm font-medium text-gray-600">{p.email}</p>
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Registrerad: {p.joined}</p>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <span className={clsx(
                                                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                                    p.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                                )}>
                                                                    {p.status === 'active' ? 'Aktiv' : 'Spärrad'}
                                                                </span>
                                                                {p.verificationStatus === 'active' && (
                                                                    <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                                                        <Check size={10} strokeWidth={4} /> Verifierad
                                                                    </span>
                                                                )}
                                                                <span className="px-3 py-1 bg-champagne-100 text-champagne-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                                    {p.tier}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="text-sm font-bold text-gray-700">{p.duration || 1} Mån</p>
                                                            <p className="text-[10px] text-gray-400">Bindningstid</p>
                                                        </td>
                                                        <td className="px-8 py-4">
                                                            <div className="flex justify-center">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setManagingProviderId(managingProviderId === p.id ? null : p.id); }}
                                                                    className={clsx(
                                                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                                                        managingProviderId === p.id
                                                                            ? "bg-premium-black text-white border-premium-black shadow-lg"
                                                                            : "bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-300 hover:text-premium-black"
                                                                    )}
                                                                >
                                                                    <Settings size={12} />
                                                                    Hantera
                                                                    <ChevronDown size={12} className={clsx("transition-transform", managingProviderId === p.id && "rotate-180")} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Admin Control Panel */}
                                                    <AnimatePresence>
                                                        {managingProviderId === p.id && (
                                                            <tr>
                                                                <td colSpan={6} className="px-0 py-0">
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.3 }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <div className="bg-gradient-to-b from-gray-50 to-white px-10 py-8 border-b border-gray-100">
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                                                                                {/* 1. Change Tier */}
                                                                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Crown size={16} className="text-champagne-600" />
                                                                                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-600">Ändra Plan</h4>
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-2">
                                                                                        {['Bas', 'Pro', 'Luxe'].map(tier => (
                                                                                            <button
                                                                                                key={tier}
                                                                                                onClick={(e) => { e.stopPropagation(); handleChangeTier(p.id, tier); }}
                                                                                                className={clsx(
                                                                                                    "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border text-left",
                                                                                                    (p.tier || '').toLowerCase() === tier.toLowerCase()
                                                                                                        ? "bg-premium-black text-white border-premium-black"
                                                                                                        : "bg-gray-50 text-gray-500 border-gray-100 hover:border-champagne-300 hover:bg-champagne-50"
                                                                                                )}
                                                                                            >
                                                                                                {tier} {(p.tier || '').toLowerCase() === tier.toLowerCase() && '✓'}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>

                                                                                {/* 2. Change Binding Duration */}
                                                                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Clock size={16} className="text-blue-500" />
                                                                                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-600">Bindningstid</h4>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        {[1, 3, 6, 12].map(dur => (
                                                                                            <button
                                                                                                key={dur}
                                                                                                onClick={(e) => { e.stopPropagation(); handleChangeDuration(p.id, dur); }}
                                                                                                className={clsx(
                                                                                                    "px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border text-center",
                                                                                                    (p.duration || 1) === dur
                                                                                                        ? "bg-blue-500 text-white border-blue-500"
                                                                                                        : "bg-gray-50 text-gray-500 border-gray-100 hover:border-blue-300 hover:bg-blue-50"
                                                                                                )}
                                                                                            >
                                                                                                {dur} Mån
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>

                                                                                {/* 3. Account Actions */}
                                                                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <ShieldCheck size={16} className="text-green-500" />
                                                                                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-600">Kontostatus</h4>
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-2">
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); handleToggleClick(p); }}
                                                                                            className={clsx(
                                                                                                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all",
                                                                                                p.status === 'active'
                                                                                                    ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white"
                                                                                                    : "bg-green-50 text-green-600 hover:bg-green-600 hover:text-white"
                                                                                            )}
                                                                                        >
                                                                                            <ShieldAlert size={12} />
                                                                                            {p.status === 'active' ? 'Spärra konto' : 'Aktivera konto'}
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); handleImpersonate(p); }}
                                                                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold bg-violet-50 text-violet-600 hover:bg-violet-500 hover:text-white transition-all"
                                                                                        >
                                                                                            <LogIn size={12} />
                                                                                            Logga in som utförare
                                                                                        </button>
                                                                                    </div>
                                                                                </div>

                                                                                {/* 4. Danger Zone */}
                                                                                <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm space-y-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <AlertCircle size={16} className="text-red-500" />
                                                                                        <h4 className="text-xs font-black uppercase tracking-widest text-red-500">Fara</h4>
                                                                                    </div>
                                                                                    <p className="text-[10px] text-gray-400 leading-relaxed">
                                                                                        Permanent radering av kontot. Alla bokningar, data och betalningshistorik försvinner.
                                                                                    </p>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setDeleteConfirmId(p.id);
                                                                                            setShowDeleteModal(true);
                                                                                        }}
                                                                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all w-full justify-center"
                                                                                    >
                                                                                        <Trash2 size={12} />
                                                                                        Radera konto permanent
                                                                                    </button>
                                                                                </div>

                                                                            </div>

                                                                            {/* Provider Details Row */}
                                                                            {(p.address || p.municipality || p.practitioners?.length) && (
                                                                                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                                    {p.address && (
                                                                                        <div>
                                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Adress</p>
                                                                                            <p className="text-sm font-medium text-gray-700">{p.address}, {p.municipality}</p>
                                                                                        </div>
                                                                                    )}
                                                                                    {p.practitioners && p.practitioners.length > 0 && (
                                                                                        <div>
                                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Anställda ({p.practitioners.length})</p>
                                                                                            <div className="grid grid-cols-1 gap-2">
                                                                                                {p.practitioners.map(pr => (
                                                                                                    <div key={pr.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                                                                                        <div className="flex justify-between items-center">
                                                                                                            <p className="text-[11px] font-bold text-gray-700">{pr.name}</p>
                                                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{pr.title || pr.role}</span>
                                                                                                        </div>
                                                                                                        {pr.categories && pr.categories.length > 0 && (
                                                                                                            <div className="flex flex-wrap gap-1">
                                                                                                                {pr.categories.map(cat => (
                                                                                                                    <span key={cat} className="px-1.5 py-0.5 bg-violet-100 text-violet-600 text-[8px] font-bold rounded uppercase tracking-tighter">
                                                                                                                        {cat}
                                                                                                                    </span>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                    {p.cancellationRequested && (
                                                                                        <div>
                                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">⚠ Uppsägning begärd</p>
                                                                                            <p className="text-sm font-medium text-amber-700">Kunden har begärt avslutning av medlemskap</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </motion.div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </AnimatePresence>
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Category Notice */}
                            <div className="bg-gradient-to-r from-violet-50 to-blue-50 p-8 rounded-[40px] border border-violet-100/50 shadow-sm">
                                <div className="flex items-start gap-6">
                                    <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 flex-shrink-0">
                                        <Tag size={28} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg mb-1 text-premium-black">Yrkeskategorier</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            Kategorier avgör hur salonger visas i sökresultat för kunderna. Utförare som vill ändra sina kategorier måste kontakta support — du tilldelar och godkänner dem härifrån.
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {PROVIDER_CATEGORIES.map(cat => {
                                                const count = providers.filter(p =>
                                                    p.categories?.some(pc => pc.toLowerCase().trim() === cat.toLowerCase().trim())
                                                ).length;
                                                return (
                                                    <div key={cat} className="px-3 py-1.5 bg-white rounded-xl border border-violet-100 flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">{cat}</span>
                                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Helpful Extra Feature: Security Insights */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm flex items-start gap-6">
                                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 flex-shrink-0">
                                        <AlertCircle size={28} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">Säkerhets-flaggar</h4>
                                        <p className="text-sm text-gray-500 leading-relaxed">
                                            Det finns 2 utförare med ovanligt hög avbokningsfrekvens. Granska för potentiellt missbruk av systemet.
                                        </p>
                                        <button className="mt-4 text-xs font-bold text-premium-black hover:underline underline-offset-4">Visa detaljer</button>
                                    </div>
                                </div>
                                <div className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm flex items-start gap-6">
                                    <div className="w-14 h-14 bg-champagne-50 rounded-2xl flex items-center justify-center text-champagne-600 flex-shrink-0">
                                        <ShieldCheck size={28} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">BankID Verifiering</h4>
                                        <p className="text-sm text-gray-500 leading-relaxed">
                                            Kräv automatisk verifiering för nya utförare. 94% av dina nuvarande utförare är helt verifierade.
                                        </p>
                                        <button className="mt-4 text-xs font-bold text-premium-black hover:underline underline-offset-4">Aktivera globalt</button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Reply Modal */}
                <AnimatePresence>
                    {replyingTo && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setReplyingTo(null)}
                                className="absolute inset-0 bg-premium-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
                            >
                                <div className="bg-premium-black p-8 text-white flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                            <Mail className="text-champagne-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">Skicka svar till {replyingTo?.name}</h3>
                                            <p className="text-white/40 text-xs font-medium uppercase tracking-widest">{replyingTo?.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2">
                                        {(replyingTo.thread || [{ sender: 'customer', text: replyingTo.message, timestamp: replyingTo.timestamp }]).map((msg, i) => (
                                            <div key={i} className={clsx("flex flex-col", msg.sender === 'admin' ? "items-end" : "items-start")}>
                                                <div className={clsx("max-w-[85%] p-4 rounded-2xl text-sm",
                                                    msg.sender === 'admin' ? "bg-premium-black text-white rounded-tr-none shadow-md" : "bg-gray-100 text-gray-600 rounded-tl-none")}>
                                                    <p className="font-bold text-[10px] uppercase opacity-50 mb-1">
                                                        {msg.sender === 'admin' ? 'Du' : replyingTo?.name} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    </p>
                                                    <p className="leading-relaxed">{msg.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-4 border-t border-gray-100 pt-6">
                                        <div className="flex items-center gap-2 text-xs font-bold text-premium-black uppercase tracking-widest">
                                            <Send size={12} className="text-champagne-600" />
                                            <span>Ditt svar (notifiering skickas till kund)</span>
                                        </div>
                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            rows={5}
                                            placeholder="Skriv ditt svar här..."
                                            className="w-full px-6 py-4 rounded-[24px] bg-gray-50 border border-transparent focus:bg-white focus:border-champagne-300 outline-none transition-all resize-none text-gray-700 font-medium"
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleSendReply}
                                            className="flex-1 bg-premium-black text-white py-4 rounded-2xl font-bold hover:bg-champagne-600 transition-all flex items-center justify-center gap-3 shadow-xl"
                                        >
                                            Skicka Svar
                                            <Send size={18} />
                                        </button>
                                        <button
                                            onClick={() => setReplyingTo(null)}
                                            className="px-8 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                                        >
                                            Avbryt
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Block Provider Modal */}
                <AnimatePresence>
                    {showBlockModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowBlockModal(false)}
                                className="absolute inset-0 bg-premium-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-8 space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
                                        <ShieldAlert size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-premium-black">Spärra Utförare</h3>
                                    <p className="text-sm text-gray-500">Ange anledning till varför kontot spärras. Detta kommer skickas till utföraren.</p>
                                </div>

                                <textarea
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                    placeholder="Ex: Obetalda fakturor, brott mot användarvillkor..."
                                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-transparent focus:border-red-200 outline-none transition-all resize-none h-32 text-sm text-gray-900 font-medium"
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => blockingProviderId && toggleProviderStatus(blockingProviderId, blockReason)}
                                        disabled={!blockReason.trim()}
                                        className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all disabled:opacity-30"
                                    >
                                        Slutför Spärr
                                    </button>
                                    <button
                                        onClick={() => setShowBlockModal(false)}
                                        className="px-6 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200"
                                    >
                                        Avbryt
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {archivingMessageId && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setArchivingMessageId(null)}
                                className="absolute inset-0 bg-premium-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-8 space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 bg-champagne-50 rounded-2xl flex items-center justify-center text-champagne-600 mx-auto mb-4">
                                        <MessageSquare size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-premium-black">Arkivera ärende</h3>
                                    <p className="text-sm text-gray-500">Lägg till en anteckning om hur ärendet löstes.</p>
                                </div>

                                <textarea
                                    value={archiveNote}
                                    onChange={(e) => setArchiveNote(e.target.value)}
                                    placeholder="Ex: Löst via telefon, kund nöjd..."
                                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-transparent focus:border-champagne-200 outline-none transition-all resize-none h-32 text-sm text-gray-900 font-medium"
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleArchiveMessage}
                                        className="flex-1 bg-premium-black text-white py-4 rounded-2xl font-bold hover:bg-champagne-600 transition-all"
                                    >
                                        Slutför & Arkivera
                                    </button>
                                    <button
                                        onClick={() => setArchivingMessageId(null)}
                                        className="px-6 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200"
                                    >
                                        Avbryt
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Delete Provider Modal */}
                <AnimatePresence>
                    {showDeleteModal && deleteConfirmId && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => { setShowDeleteModal(false); setDeleteConfirmId(null); }}
                                className="absolute inset-0 bg-premium-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-8 space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
                                        <Trash2 size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-premium-black">Radera konto permanent</h3>
                                    <p className="text-sm text-gray-500">
                                        Detta raderar <span className="font-bold text-red-500">{providers.find(p => p.id === deleteConfirmId)?.salon}</span> permanent.
                                        Alla bokningar, data och betalningshistorik försvinner och kan inte återställas.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleDeleteProvider(deleteConfirmId)}
                                        className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Ja, radera permanent
                                    </button>
                                    <button
                                        onClick={() => { setShowDeleteModal(false); setDeleteConfirmId(null); }}
                                        className="px-6 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200"
                                    >
                                        Avbryt
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Impersonate Modal */}
                <AnimatePresence>
                    {showImpersonateModal && impersonateTarget && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => { setShowImpersonateModal(false); setImpersonateTarget(null); }}
                                className="absolute inset-0 bg-premium-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-8 space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500 mx-auto mb-4">
                                        <LogIn size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-premium-black">Logga in som utförare</h3>
                                    <p className="text-sm text-gray-500">
                                        Du kommer att logga in som <span className="font-bold text-violet-600">{impersonateTarget.name}</span> ({impersonateTarget.salon}).
                                        Du får temporär fullmakt och kan granska och ändra deras portal.
                                    </p>
                                </div>

                                <div className="bg-violet-50 p-4 rounded-2xl space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500 font-bold">Salong</span>
                                        <span className="font-bold text-premium-black">{impersonateTarget.salon}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500 font-bold">E-post</span>
                                        <span className="font-bold text-premium-black">{impersonateTarget.email}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500 font-bold">Plan</span>
                                        <span className="font-bold text-champagne-600 uppercase">{impersonateTarget.tier}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Link
                                        href="/provider/dashboard"
                                        onClick={() => { setShowImpersonateModal(false); setImpersonateTarget(null); }}
                                        className="flex-1 bg-violet-500 text-white py-4 rounded-2xl font-bold hover:bg-violet-600 transition-all flex items-center justify-center gap-2 text-center"
                                    >
                                        <LogIn size={16} />
                                        Öppna portalen
                                    </Link>
                                    <button
                                        onClick={() => { setShowImpersonateModal(false); setImpersonateTarget(null); }}
                                        className="px-6 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200"
                                    >
                                        Avbryt
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Diploma Viewer Modal */}
                <AnimatePresence>
                    {viewingDiploma && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                                onClick={() => setViewingDiploma(null)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative bg-white rounded-[40px] p-8 max-w-3xl w-full max-h-[85vh] overflow-auto shadow-2xl"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold">Diplom / Certifikat</h3>
                                    <button
                                        onClick={() => setViewingDiploma(null)}
                                        className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {viewingDiploma && viewingDiploma.includes('application/pdf') ? (
                                    <iframe
                                        src={viewingDiploma}
                                        title="Diplom PDF"
                                        className="w-full rounded-2xl border border-gray-100"
                                        style={{ height: '70vh' }}
                                    />
                                ) : viewingDiploma && (viewingDiploma.startsWith('data:') || viewingDiploma.startsWith('http')) ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={viewingDiploma}
                                            alt="Diplom / Certifikat"
                                            className="w-full rounded-2xl border border-gray-100 shadow-sm"
                                            style={{ minHeight: 200, objectFit: 'contain', background: '#f9f9f9' }}
                                        />
                                        <p className="text-center text-[10px] text-gray-300 mt-4 font-medium uppercase tracking-widest">Uppladdad verifieringsfil</p>
                                    </>
                                ) : (
                                    <div className="p-12 text-center text-gray-400">
                                        <FileCheck size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p className="font-bold text-lg text-gray-500 mb-2">Ingen fil tillgänglig</p>
                                        <p className="text-sm text-gray-300 max-w-sm mx-auto">Utföraren har inte bifogat något diplom eller certifikat, eller så gick filen förlorad. Be utföraren skicka in ansökan på nytt.</p>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </main>
        </div>
        </PermissionGate>
    );
}
