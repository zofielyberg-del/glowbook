'use client';

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Shield, CreditCard, LogOut, ChevronRight, ChevronDown, User, Store, Bell, Check, MapPin, Star, AlertTriangle, Clock, Info, X, Camera, Image as ImageIcon, Sparkles, MessageSquare, ClipboardList, Users, Upload, ExternalLink, Plus, CheckCircle2, XCircle, Instagram, ArrowRight, Trash2, Wallet, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import WeeklyScheduleGrid from "@/components/schedule/WeeklyScheduleGrid";
import { useLanguage } from "@/context/LanguageContext";
import { NORDIC_COUNTRIES, getMunicipalities } from "@/data/nordic-data";
import {
    getDefaultLoyaltyState, calculateLoyaltyStatus,
    LOYALTY_COOLDOWN_DAYS, LOYALTY_MIN_ACTIVE_DAYS,
    type ProviderLoyaltyState, type LoyaltyStatus
} from "@/lib/loyalty";

type TabKey = 'profile' | 'membership' | 'payments' | 'loyalty' | 'inbox' | 'notifications' | 'marketing' | 'reviews' | 'templates' | 'practitioners';

export default function SettingsPage() {
    return (
        <Suspense fallback={null}>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
    const searchParams = useSearchParams();
    const { t, language, setLanguage, currency, setCurrency } = useLanguage();
    const initialTab = (searchParams.get('tab') as TabKey) || 'profile';
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [salonData, setSalonData] = useState({
        id: '' as string,
        name: '',
        category: '',
        country: 'Sverige',
        municipality: '',
        address: '',
        firstName: '',
        lastName: '',
        description: '',
        email: '',
        tier: 'pro',
        duration: 1,
        profileImage: null as string | null,
        backgroundImage: null as string | null,
        isVerified: false,
        verificationStatus: 'none' as 'none' | 'pending' | 'active',
        practitioners: [] as { id: string; name: string; role: string; title: string; status: string; image?: string; schedule?: any; categories?: string[] }[],
        appointments: [] as any[],
        categories: [] as string[],
        galleryImages: [] as string[],
        slug: '',
        stripeConnected: false,
        subscription_status: 'none' as string,
        cancellation_window_hours: 24,
    });
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
    const [isAddPractitionerModalOpen, setIsAddPractitionerModalOpen] = useState(false);
    const [managingScheduleId, setManagingScheduleId] = useState<string | null>(null);
    const [editingPractitionerId, setEditingPractitionerId] = useState<string | null>(null);
    const [newPractitioner, setNewPractitioner] = useState({ name: '', role: '', title: '', categories: [] as string[], image: '' });
    const [scheduleBuffer, setScheduleBuffer] = useState<any>({});
    const [uploadedDiploma, setUploadedDiploma] = useState<string | null>(null);
    const [loyaltyState, setLoyaltyState] = useState<ProviderLoyaltyState>(getDefaultLoyaltyState());

    // Cancellation & UI states
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [comparisonDuration, setComparisonDuration] = useState(1);

    useEffect(() => {
        const loadData = async () => {
            const saved = sessionStorage.getItem('glowbook_salon');
            if (saved) {
                const localData = JSON.parse(saved);

                // Fallback to local data first for instant UI
                setSalonData(prev => ({ ...prev, ...localData }));
                setComparisonDuration(localData.duration || 1);

                // Then try to fetch fresh data from server if it has a real ID
                if (localData.id && localData.id.length > 20) {
                    try {
                        const response = await fetch(`/api/salons/get?id=${localData.id}&_t=${Date.now()}`);
                        const serverData = await response.json();
                        if (serverData.success && serverData.salon) {
                            const salon = serverData.salon;
                            // If category is an array (new format), split it into primary and additional
                            if (Array.isArray(salon.category)) {
                                const [main, ...additional] = salon.category;
                                setSalonData(prev => ({
                                    ...prev,
                                    ...salon,
                                    category: main || '',
                                    categories: additional || []
                                }));
                            } else {
                                setSalonData(prev => ({ ...prev, ...salon }));
                            }
                            sessionStorage.setItem('glowbook_salon', JSON.stringify(serverData.salon));
                        }
                    } catch (e) {
                        console.error('Failed to fetch salon from server:', e);
                    }
                }
            }

            const savedLoyalty = localStorage.getItem('glowbook_provider_loyalty');
            if (savedLoyalty) {
                try { setLoyaltyState(JSON.parse(savedLoyalty)); } catch { }
            }

            // Load notifications
            const savedNotifications = localStorage.getItem('glowbook_provider_notifications');
            if (savedNotifications) {
                try { setNotifications(JSON.parse(savedNotifications)); } catch { }
            }
        };

        loadData();
        window.addEventListener('glowbook_update', loadData);
        window.addEventListener('storage', loadData);

        return () => {
            window.removeEventListener('glowbook_update', loadData);
            window.removeEventListener('storage', loadData);
        };
    }, []);

    const markNotificationAsRead = (id: string) => {
        const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
        setNotifications(updated);
        localStorage.setItem('glowbook_provider_notifications', JSON.stringify(updated));
    };

    const hasUnreadNotifications = notifications.some(n => !n.read);

    // Sync Language and Currency when country changes
    useEffect(() => {
        const countryData = NORDIC_COUNTRIES.find(c => c.name === salonData.country);
        if (countryData) {
            // Only update context if it differs to avoid loops
            if (countryData.language !== language) {
                setLanguage(countryData.language as any);
            }
            setCurrency(countryData.currency);
        }
    }, [salonData.country, language, setLanguage, setCurrency]);

    const handleImageUpload = (type: 'profile' | 'background' | 'gallery', file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = type === 'background' ? 1200 : 800;
                const MAX_HEIGHT = type === 'background' ? 600 : 800;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                const base64String = canvas.toDataURL('image/jpeg', 0.7);
                
                if (type === 'gallery') {
                    setSalonData(prev => ({
                        ...prev,
                        galleryImages: [...(prev.galleryImages || []), base64String]
                    }));
                } else {
                    setSalonData(prev => ({
                        ...prev,
                        [type === 'profile' ? 'profileImage' : 'backgroundImage']: base64String
                    }));
                }
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    };

    const removeGalleryImage = (index: number) => {
        setSalonData(prev => ({
            ...prev,
            galleryImages: (prev.galleryImages || []).filter((_, i) => i !== index)
        }));
    };

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const isFirstRender = useRef(true);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSave = async (dataToSave = salonData) => {
        setIsSaving(true);
        setSaveStatus('idle');
        setErrorMessage('');
        const salonId = dataToSave.id || (dataToSave.name ? dataToSave.name.toLowerCase().replace(/\s+/g, '-') : `salon-${Date.now()}`);

        // Auto-generate slug from name for all tiers to ensure URL matches salon name
        const computedSlug = dataToSave.name
            ? dataToSave.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            : (dataToSave as any).slug;

        const updatedData = {
            ...dataToSave,
            id: salonId,
            currency: currency,
            slug: computedSlug
        };
        
        // Critical fix: Never send availability from the settings tab to prevent overwriting with stale data
        delete (updatedData as any).availability;

        // Sync with server
        try {
            const response = await fetch('/api/salons/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                const errData = await response.json();
                console.error('Failed to sync salon data to server:', errData);
                setSaveStatus('error');
                setErrorMessage(errData.error || errData.details || 'Kunde inte spara');
            } else {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 3000);
            }
        } catch (error: any) {
            console.error('Network error during salon sync:', error);
            setSaveStatus('error');
            setErrorMessage(error.message || 'Nätverksfel');
        } finally {
            setIsSaving(false);
        }

        sessionStorage.setItem('glowbook_salon', JSON.stringify(updatedData));
        localStorage.setItem('glowbook_salon', JSON.stringify(updatedData));
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
    };

    // Auto-save: debounce 1.5s after salonData changes (skip first render)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            handleSave(salonData);
        }, 1500);
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [salonData]);

    const loyaltyInfo = calculateLoyaltyStatus(loyaltyState, new Date());

    const handleActivateLoyalty = () => {
        const updated: ProviderLoyaltyState = {
            enabled: true,
            status: 'active',
            activatedAt: new Date().toISOString(),
            deactivationRequestedAt: null,
            deactivatedAt: null,
            cooldownEndsAt: null,
        };
        setLoyaltyState(updated);
        localStorage.setItem('glowbook_provider_loyalty', JSON.stringify(updated));
    };

    const handleDeactivateLoyalty = () => {
        const updated: ProviderLoyaltyState = {
            ...loyaltyState,
            deactivationRequestedAt: new Date().toISOString(),
        };
        setLoyaltyState(updated);
        localStorage.setItem('glowbook_provider_loyalty', JSON.stringify(updated));
    };

    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedTier, setSelectedTier] = useState<string | null>(null);

    const handleUpgradeClick = async (tier: 'bas' | 'pro' | 'luxe') => {
        try {
            const response = await fetch('/api/stripe/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tier,
                    salonId: salonData.id,
                    salonEmail: salonData.email // Fixed: changed email to salonEmail to match API
                }),
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || 'Kunde inte skapa betalningssession');
            }
        } catch (error) {
            console.error('Error during upgrade:', error);
            alert('Ett oväntat fel uppstod');
        }
    };

    const confirmUpgrade = () => {
        const updated = {
            ...salonData,
            tier: selectedTier || 'pro',
            duration: comparisonDuration
        };
        setSalonData(updated as any);
        sessionStorage.setItem('glowbook_salon', JSON.stringify(updated));

        setIsCheckoutOpen(false);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);

        window.dispatchEvent(new Event('glowbook_update'));
    };

    const [isReactivating, setIsReactivating] = useState(false);

    const handleCancelMembership = async () => {
        setIsCancelling(true);
        try {
            const response = await fetch('/api/stripe/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salonId: salonData.id })
            });
            const data = await response.json();
            if (data.success) {
                const updated = {
                    ...salonData,
                    subscription_status: 'canceling'
                };
                setSalonData(updated as any);
                sessionStorage.setItem('glowbook_salon', JSON.stringify(updated));
                window.dispatchEvent(new Event('glowbook_update'));
                
                setIsCancelModalOpen(false);
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
            } else {
                alert(data.error || 'Kunde inte avsluta medlemskap');
            }
        } catch (error) {
            console.error('Error canceling membership:', error);
            alert('Ett nätverksfel uppstod.');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleReactivateMembership = async () => {
        setIsReactivating(true);
        try {
            const response = await fetch('/api/stripe/reactivate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salonId: salonData.id })
            });
            const data = await response.json();
            if (data.success) {
                const updated = {
                    ...salonData,
                    subscription_status: 'active'
                };
                setSalonData(updated as any);
                sessionStorage.setItem('glowbook_salon', JSON.stringify(updated));
                window.dispatchEvent(new Event('glowbook_update'));
                
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
            } else {
                alert(data.error || 'Kunde inte återaktivera medlemskap');
            }
        } catch (error) {
            console.error('Error reactivating membership:', error);
            alert('Ett nätverksfel uppstod.');
        } finally {
            setIsReactivating(false);
        }
    };

    const TABS = [
        { key: 'profile' as TabKey, label: t('tab_profile'), icon: User },
        { key: 'membership' as TabKey, label: t('tab_membership'), icon: Shield },
        { key: 'payments' as TabKey, label: 'Betalningar', icon: Wallet },
        { key: 'loyalty' as TabKey, label: 'Lojalitet', icon: Star },
        {
            key: 'inbox' as TabKey,
            label: 'Inkorg',
            icon: MessageSquare,
            badge: hasUnreadNotifications
        },
        { key: 'notifications' as TabKey, label: 'Inställningar', icon: Bell },
        { key: 'marketing' as TabKey, label: t('tab_marketing'), icon: Sparkles },
        { key: 'templates' as TabKey, label: t('tab_templates'), icon: ClipboardList },
        ...(salonData.tier === 'luxe' ? [{ key: 'practitioners' as TabKey, label: t('tab_practitioners'), icon: Users }] : []),
    ];

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Header />

            <main className="max-w-7xl mx-auto px-6 pt-24 pb-12">
                <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end gap-3">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-foreground inline-flex items-center gap-2">
                            {t('settings_title')}
                            {salonData.isVerified && (
                                <div className="p-1 bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/20" title="Verifierad Utförare">
                                    <Check size={14} strokeWidth={4} />
                                </div>
                            )}
                        </h1>
                        <p className="text-foreground/50">{t('settings_desc')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar Tabs */}
                    <div className="lg:col-span-1 space-y-2">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => {
                                        setActiveTab(tab.key);
                                        if (tab.key === 'inbox') {
                                            // Handle marking as read if needed? 
                                            // Or maybe mark all as read when opening?
                                        }
                                    }}
                                    className={clsx(
                                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all group relative",
                                        activeTab === tab.key
                                            ? "bg-foreground text-background shadow-lg"
                                            : "hover:bg-foreground/5 text-foreground/40 hover:text-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "p-2 rounded-xl transition-colors",
                                            activeTab === tab.key ? "bg-background/10" : "bg-foreground/5 group-hover:bg-foreground/10"
                                        )}>
                                            <Icon size={18} />
                                        </div>
                                        <span className="font-bold text-sm tracking-tight">{tab.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(tab as any).badge && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        )}
                                        <ChevronRight size={16} className={clsx(
                                            "transition-transform",
                                            activeTab === tab.key ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                                        )} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* ===== PROFIL & KONTO TAB ===== */}
                        {activeTab === 'profile' && (
                            <>
                                {/* Salon Section */}
                                <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-champagne-50 dark:bg-champagne-950 text-champagne-700 dark:text-champagne-400 rounded-lg">
                                            <Store size={20} />
                                        </div>
                                        <h2 className="text-xl font-bold text-foreground">Salongsuppgifter</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-foreground mb-2">{t('label_business_name')}</label>
                                            <input
                                                type="text"
                                                value={salonData.name}
                                                onChange={(e) => setSalonData({ ...salonData, name: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:border-champagne-500 outline-none transition-all placeholder:text-foreground/30"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-foreground mb-2">{t('label_country')}</label>
                                            <select
                                                value={salonData.country}
                                                onChange={(e) => setSalonData({ ...salonData, country: e.target.value, municipality: '' })}
                                                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:border-champagne-500 outline-none transition-all"
                                            >
                                                {NORDIC_COUNTRIES.map(c => <option key={c.code} value={c.name} className="bg-card">{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-foreground mb-2">{t('label_municipality')}</label>
                                            <select
                                                value={salonData.municipality}
                                                onChange={(e) => setSalonData({ ...salonData, municipality: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:border-champagne-500 outline-none transition-all"
                                            >
                                                <option value="" className="bg-card">{t('location_search_placeholder')}</option>
                                                {getMunicipalities(NORDIC_COUNTRIES.find(c => c.name === salonData.country)?.code || 'SE').map(m => (
                                                    <option key={m} value={m} className="bg-card">{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-foreground mb-2">{t('label_address')}</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3.5 text-foreground/30" size={18} />
                                                <input
                                                    type="text"
                                                    value={salonData.address}
                                                    onChange={(e) => setSalonData({ ...salonData, address: e.target.value })}
                                                    placeholder={t('label_address_placeholder')}
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground focus:border-champagne-500 outline-none transition-all placeholder:text-foreground/30"
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-foreground mb-2">{t('label_main_category')}</label>
                                            <div className="relative">
                                                <select
                                                    value={salonData.category}
                                                    onChange={(e) => setSalonData({ ...salonData, category: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-xl border border-border bg-card text-foreground focus:border-champagne-500 outline-none transition-all shadow-sm appearance-none cursor-pointer font-bold"
                                                >
                                                    <option value="">Välj huvudkategori...</option>
                                                    <option value="Fransar & Bryn">Fransar & Bryn</option>
                                                    <option value="Hårvård">Hårvård</option>
                                                    <option value="Naglar">Naglar</option>
                                                    <option value="Massage">Massage</option>
                                                    <option value="Hudvård">Hudvård</option>
                                                    <option value="Estetisk Injektion">Estetisk Injektion</option>
                                                    <option value="Tatuering">Tatuering</option>
                                                    <option value="Fotvård">Fotvård</option>
                                                    <option value="Spa">Spa</option>
                                                    <option value="Makeup">Makeup</option>
                                                    <option value="Barberare">Barberare</option>
                                                    <option value="Piercing">Piercing</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/30">
                                                    <ChevronDown size={20} />
                                                </div>
                                            </div>
                                            
                                            <div className="mt-6">
                                                <label className="block text-xs font-black uppercase tracking-widest text-foreground/30 mb-3">Ytterligare kategorier (synlighet)</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {["Naglar", "Hudvård", "Hårvård", "Massage", "Fransar & Bryn", "Estetisk Injektion", "Tatuering", "Spa", "Makeup", "Fotvård", "Kiropraktik", "Naprapati", "Tandblekning", "Piercing", "Barberare"].map(cat => {
                                                        const isMain = salonData.category === cat;
                                                        const isSelected = (salonData.categories || []).includes(cat) || isMain;
                                                        
                                                        return (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                disabled={isMain}
                                                                onClick={() => {
                                                                    const currentCats = salonData.categories || [];
                                                                    if (currentCats.includes(cat)) {
                                                                        setSalonData({
                                                                            ...salonData,
                                                                            categories: currentCats.filter(c => c !== cat)
                                                                        });
                                                                    } else {
                                                                        setSalonData({
                                                                            ...salonData,
                                                                            categories: [...currentCats, cat]
                                                                        });
                                                                    }
                                                                }}
                                                                className={clsx(
                                                                    "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                                                                    isSelected 
                                                                        ? "bg-violet-600 text-white border-violet-600 shadow-md" 
                                                                        : "bg-card text-foreground/40 border-border hover:border-violet-300 hover:text-violet-500",
                                                                    isMain && "opacity-50 cursor-not-allowed"
                                                                )}
                                                            >
                                                                {cat}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-foreground/30 mt-4 pl-1 flex items-center gap-2">
                                                <Info size={12} />
                                                Huvudkategorin styr din primära placering. Ytterligare kategorier gör att du även dyker upp vid filtrering och sökning inom dessa områden.
                                            </p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-foreground mb-2">Beskrivning (Om oss)</label>
                                            <textarea
                                                value={salonData.description}
                                                onChange={(e) => setSalonData({ ...salonData, description: e.target.value })}
                                                placeholder="Berätta kort om din verksamhet..."
                                                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:border-champagne-500 outline-none transition-all min-h-[120px] resize-none"
                                            />
                                            <p className="text-[10px] text-foreground/40 mt-2 italic">Denna text visas på din offentliga profilsida under sektionen "Om oss".</p>
                                        </div>
                                    </div>
                                </section>

                                {/* Salon Appearance Section */}
                                <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 rounded-lg">
                                            <ImageIcon size={20} />
                                        </div>
                                        <h2 className="text-xl font-bold text-foreground">{t('salon_appearance_title')}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {/* Profile Picture */}
                                        <div className="relative aspect-square bg-foreground/5 rounded-2xl overflow-hidden group border border-border flex items-center justify-center">
                                            {salonData.profileImage ? (
                                                <img src={salonData.profileImage} className="w-full h-full object-cover" alt="Profile" />
                                            ) : (
                                                <div className="text-foreground/40 flex flex-col items-center gap-2">
                                                    <Camera size={32} />
                                                    <span className="text-sm font-medium">Profilbild</span>
                                                </div>
                                            )}
                                            <label className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                                <input type="file" className="sr-only" onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleImageUpload('profile', file);
                                                }} />
                                                <div className="bg-card text-foreground px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 text-center border border-border">
                                                    <Camera size={16} /> Uppdatera
                                                </div>
                                            </label>
                                        </div>

                                        {/* Background / Banner */}
                                        <div className="md:col-span-2 relative h-48 bg-foreground/5 rounded-2xl overflow-hidden group border border-border">
                                            {salonData.backgroundImage ? (
                                                <img src={salonData.backgroundImage} className="w-full h-full object-cover" alt="Background" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                                    <ImageIcon size={32} />
                                                    <span className="text-sm font-medium">Bakgrundsbild (1200x400)</span>
                                                </div>
                                            )}
                                            <label className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                                <input type="file" className="sr-only" onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleImageUpload('background', file);
                                                }} />
                                                <div className="bg-card text-foreground px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 border border-border">
                                                    <Camera size={16} /> Ändra bakgrund
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Gallery Images */}
                                    <div className="pt-6 border-t border-border space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground">Bildgalleri</h3>
                                                <p className="text-[10px] text-foreground/40 mt-0.5">Visa upp ditt arbete. Dessa bilder syns på din offentliga salongsida.</p>
                                            </div>
                                            <label className="px-4 py-2 bg-foreground text-background rounded-xl text-xs font-bold cursor-pointer hover:bg-champagne-600 hover:text-white transition-all flex items-center gap-2 shadow-md">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="sr-only"
                                                    onChange={(e) => {
                                                        const files = e.target.files;
                                                        if (files) {
                                                            Array.from(files).forEach(file => handleImageUpload('gallery', file));
                                                        }
                                                    }}
                                                />
                                                <Plus size={14} />
                                                Lägg till bilder
                                            </label>
                                        </div>

                                        {(salonData.galleryImages || []).length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {(salonData.galleryImages || []).map((img, idx) => (
                                                    <div key={idx} className="relative aspect-[4/3] rounded-xl overflow-hidden group border border-border bg-foreground/5">
                                                        <img src={img} className="w-full h-full object-cover" alt={`Galleri ${idx + 1}`} />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button
                                                                onClick={() => removeGalleryImage(idx)}
                                                                className="p-2.5 bg-red-500 text-white rounded-full shadow-xl hover:bg-red-600 transition-all transform hover:scale-110"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                            {idx + 1}
                                                        </div>
                                                    </div>
                                                ))}
                                                <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-border hover:border-champagne-500 cursor-pointer flex flex-col items-center justify-center gap-2 text-foreground/30 hover:text-champagne-600 hover:bg-champagne-500/5 transition-all">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="sr-only"
                                                        onChange={(e) => {
                                                            const files = e.target.files;
                                                            if (files) {
                                                                Array.from(files).forEach(file => handleImageUpload('gallery', file));
                                                            }
                                                        }}
                                                    />
                                                    <Plus size={24} />
                                                    <span className="text-[10px] font-bold">Lägg till</span>
                                                </label>
                                            </div>
                                        ) : (
                                            <label className="block w-full py-12 rounded-2xl border-2 border-dashed border-border hover:border-champagne-500 cursor-pointer text-center transition-all hover:bg-champagne-500/5 group">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="sr-only"
                                                    onChange={(e) => {
                                                        const files = e.target.files;
                                                        if (files) {
                                                            Array.from(files).forEach(file => handleImageUpload('gallery', file));
                                                        }
                                                    }}
                                                />
                                                <ImageIcon size={32} className="mx-auto text-foreground/20 group-hover:text-champagne-500 transition-colors mb-3" />
                                                <p className="text-sm font-medium text-foreground/30 group-hover:text-champagne-600 transition-colors">Dra och släpp bilder eller klicka för att ladda upp</p>
                                                <p className="text-[10px] text-foreground/20 mt-1">JPG, PNG • Max 5MB per bild</p>
                                            </label>
                                        )}
                                    </div>
                                </section>

                                {/* Personal Section */}
                                <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg">
                                            <User size={20} />
                                        </div>
                                        <h2 className="text-xl font-bold text-foreground">{t('settings_personal_title')}</h2>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-foreground mb-2">{t('label_first_name')}</label>
                                            <input
                                                type="text"
                                                value={salonData.firstName}
                                                onChange={(e) => setSalonData({ ...salonData, firstName: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:border-champagne-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-foreground mb-2">{t('label_last_name')}</label>
                                            <input
                                                type="text"
                                                value={salonData.lastName}
                                                onChange={(e) => setSalonData({ ...salonData, lastName: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:border-champagne-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-bold text-foreground mb-2">{t('label_email')}</label>
                                            <input
                                                type="email"
                                                value={salonData.email}
                                                onChange={(e) => setSalonData({ ...salonData, email: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:border-champagne-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Auto-save status indicator */}
                                <div className="flex justify-end items-center h-8">
                                    {isSaving && (
                                        <span className="text-foreground/40 text-xs font-medium flex items-center gap-1.5">
                                            <RefreshCw size={12} className="animate-spin" /> Sparar...
                                        </span>
                                    )}
                                    {!isSaving && saveStatus === 'success' && (
                                        <motion.span
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-green-600 dark:text-green-400 text-xs font-medium flex items-center gap-1.5"
                                        >
                                            <Check size={12} /> Sparat automatiskt
                                        </motion.span>
                                    )}
                                    {!isSaving && saveStatus === 'error' && (
                                        <span className="text-red-500 text-xs font-medium flex items-center gap-1.5">
                                            <AlertTriangle size={12} /> {errorMessage || 'Kunde inte spara'}
                                        </span>
                                    )}
                                </div>

                                {/* Verification Section */}
                                <section className="bg-card p-8 rounded-3xl border border-border mt-8 shadow-sm space-y-6 text-foreground transition-all overflow-hidden hover:border-blue-500/30">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">Verifierat konto</h2>
                                            <p className="text-foreground/50 text-xs">Bygg extra förtroende hos dina kunder med en verifierings-badge.</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-foreground/[0.02] rounded-2xl border border-border transition-colors">
                                        <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
                                            <Check size={32} />
                                        </div>
                                        <div className="flex-1 text-center md:text-left space-y-1">
                                            <h4 className="font-bold text-sm">Ansök om verifiering</h4>
                                            <p className="text-xs text-foreground/50 leading-relaxed max-w-md">
                                                Ladda upp ditt certifikat, gesällbrev eller annat bevis på din kompetens. Våra administratörer granskar din profil manuellt.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setIsVerificationModalOpen(true)}
                                            className="w-full md:w-auto px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-400 hover:text-white transition-all shadow-md active:scale-95"
                                        >
                                            {t('verification_upload_btn')}
                                        </button>
                                    </div>
                                </section>
                            </>
                        )}

                        {/* ===== MEDLEMSKAP TAB ===== */}
                        {activeTab === 'membership' && (
                            <div className="space-y-8">
                                {/* Current Status */}
                                <section className="bg-gradient-to-br from-[#1a1a1a] to-[#111] p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <Shield size={120} strokeWidth={1} />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="text-right">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                                                    <Check size={12} /> {t('label_status_active')}
                                                </span>
                                                <span className="block text-xs text-white/40 mt-2">{salonData.duration} månader</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 mt-6">
                                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Plan</p>
                                                <p className="text-sm font-bold text-white capitalize">{salonData.tier}</p>
                                            </div>
                                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Period</p>
                                                <p className="text-sm font-bold text-white">{salonData.duration} Mån</p>
                                            </div>
                                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Status</p>
                                                <p className="text-sm font-bold text-green-400">Aktiv</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Duration Selector */}
                                <div className="flex flex-wrap gap-2 p-1.5 bg-foreground/5 rounded-2xl border border-border">
                                    {[
                                        { val: 1, label: '1 Månad', discount: 0 },
                                        { val: 3, label: '3 Månader', discount: 5 },
                                        { val: 6, label: '6 Månader', discount: 10 },
                                        { val: 12, label: '12 Månader', discount: 15 },
                                    ].map((d) => (
                                        <button
                                            key={d.val}
                                            onClick={() => setComparisonDuration(d.val)}
                                            className={clsx(
                                                "flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-visible",
                                                comparisonDuration === d.val
                                                    ? "bg-white dark:bg-[#111] text-foreground shadow-sm"
                                                    : "text-foreground/40 hover:text-foreground"
                                            )}
                                        >
                                            {d.label}
                                            {d.discount > 0 && (
                                                <span className="absolute -top-2 -right-1 bg-pink-500 text-white text-[7px] px-1.5 py-0.5 rounded-full ring-2 ring-card font-black">
                                                    {d.discount}% OFF
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Plans Comparison */}
                                <section className="space-y-4">
                                    <h3 className="font-bold text-lg text-foreground px-2">Jämför & uppgradera</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { key: 'bas', label: 'Bas', price: 79, perks: ['Bokningskalender', 'Standardprofil', 'Begränsad synlighet', 'Endast lokalt synlig'], limit: 'Max 20 bokn/Mån', desc: t('label_tier_start_desc') },
                                            { key: 'pro', label: 'PRO', price: 149, perks: ['Syns högre i sök', 'Syns i "Upptäck"', 'Glow-tag (Kort länk)', 'SMS-påminnelser', 'Obegränsade bokningar'], popular: true, desc: t('label_tier_pro_desc') },
                                            { key: 'luxe', label: 'LUXE', price: 249, perks: ['Högsta ranking (VIP)', 'Featured i din stad', 'Glow-tag (Kort länk)', 'Flera utförare (Team)', 'VIP Support'], note: 'Bäst för salonger', desc: t('label_tier_studio_desc') },
                                        ].map((p: { key: string; label: string; price: number; perks: string[]; popular?: boolean; limit?: string; note?: string; desc: string }) => {
                                            const discountFactor = { 1: 1, 3: 0.95, 6: 0.9, 12: 0.85 }[comparisonDuration] || 1;
                                            const monthlyPrice = Math.round(p.price * discountFactor);
                                            const totalCost = monthlyPrice * comparisonDuration;

                                            return (
                                                <div
                                                    key={p.key}
                                                    className={clsx(
                                                        "bg-card p-6 rounded-3xl border transition-all flex flex-col justify-between relative",
                                                        salonData.tier === p.key ? "border-champagne-500 shadow-md ring-1 ring-champagne-100" : "border-border shadow-sm",
                                                        p.popular && "pt-10"
                                                    )}
                                                >
                                                    {p.popular && (
                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-champagne-500 text-white text-[9px] px-4 py-1.5 rounded-full font-black uppercase tracking-[0.2em] shadow-lg z-10">
                                                            Rekommenderas
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-base uppercase tracking-widest">{p.label}</h4>
                                                            {p.popular && <Star size={14} className="fill-champagne-500 text-champagne-500" />}
                                                        </div>
                                                        <p className="text-[10px] text-foreground/50 font-medium mb-4">{p.desc}</p>

                                                        <div className="flex flex-col gap-0.5 mb-6">
                                                            <div className="text-3xl font-black text-foreground">
                                                                {monthlyPrice} <span className="text-xs font-bold opacity-40 uppercase tracking-widest">SEK</span>
                                                            </div>
                                                            <div className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                                                                per Månad
                                                            </div>
                                                            {comparisonDuration > 1 && (
                                                                <div className="mt-2 text-[10px] font-black text-champagne-600 bg-champagne-50 dark:bg-champagne-950/30 px-3 py-1.5 rounded-lg inline-block w-fit">
                                                                    Totalt: {totalCost.toLocaleString()} kr / {comparisonDuration} Mån
                                                                </div>
                                                            )}
                                                        </div>

                                                        <ul className="space-y-3 mb-6">
                                                            {p.perks.map(perk => (
                                                                <li key={perk} className="text-[10px] text-foreground/70 font-bold flex items-center gap-2">
                                                                    <div className="w-4 h-4 rounded-full bg-champagne-500 flex items-center justify-center text-white shrink-0">
                                                                        <Check size={10} strokeWidth={4} />
                                                                    </div>
                                                                    {perk}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        {p.limit && <p className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-md mb-4 w-fit">{p.limit}</p>}
                                                        {p.note && <p className="text-[9px] font-bold text-champagne-500 bg-champagne-50 dark:bg-champagne-950/20 px-2 py-1 rounded-md mb-4 w-fit">{p.note}</p>}
                                                    </div>
                                                    <button
                                                        onClick={() => handleUpgradeClick(p.key as any)}
                                                        disabled={salonData.tier === p.key && comparisonDuration === (salonData.duration || 12)}
                                                        className={clsx(
                                                            "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all box-border border flex flex-col items-center justify-center gap-1",
                                                            salonData.tier === p.key && comparisonDuration === (salonData.duration || 12)
                                                                ? "bg-foreground/5 text-foreground/30 border-foreground/5 cursor-default"
                                                                : "bg-[#111] dark:bg-white text-white dark:text-[#111] hover:bg-champagne-600 dark:hover:bg-champagne-300 border-transparent shadow-lg active:scale-95"
                                                        )}
                                                    >
                                                        <span>
                                                            {salonData.tier === p.key && comparisonDuration === (salonData.duration || 12) 
                                                                ? 'Nuvarande plan' 
                                                                : salonData.subscription_status === 'trialing' ? 'Uppgradera plan' : 'Starta 30 dagars gratis prova-på'}
                                                        </span>
                                                        {!(salonData.tier === p.key && comparisonDuration === (salonData.duration || 12)) && (
                                                            <span className="text-[7px] opacity-50 lowercase font-medium tracking-normal flex items-center gap-1">
                                                                <CreditCard size={8} /> Endast verifiering — 0 kr idag
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="bg-blue-50/50 dark:bg-blue-950/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/10 flex items-start gap-4 mt-8">
                                        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1 flex-1">
                                            <p className="text-sm font-bold text-foreground">Abonnemanget är låst</p>
                                            <p className="text-[11px] text-foreground/50 leading-relaxed">
                                                Du befinner dig i en aktiv bindningstid på {salonData.duration} Månader. Under denna period kan du inte byta abonnemangsform själv i portalen. Kontakta supporten om du vill planera ett byte vid periodens slut.
                                            </p>
                                        </div>
                                    </div>

                                    {salonData.subscription_status === 'canceling' ? (
                                        <div className="mt-8 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-6 rounded-3xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
                                                    <AlertTriangle size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">Uppsägning pågår</p>
                                                    <p className="text-xs text-foreground/50">Ditt medlemskap avslutas efter bindningstidens slut.</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleReactivateMembership}
                                                disabled={isReactivating}
                                                className="text-xs font-bold text-amber-600 hover:underline disabled:opacity-50 flex items-center gap-1"
                                            >
                                                {isReactivating ? <div className="w-3 h-3 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" /> : 'Ångra uppsägning'}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsCancelModalOpen(true)}
                                            className="mt-8 w-full py-4 text-xs font-bold text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl border border-transparent hover:border-red-100 transition-all uppercase tracking-widest"
                                        >
                                            Avsluta medlemskap
                                        </button>
                                    )}
                                </section>
                            </div>
                        )}

                        {/* ===== CANCELLATION MODAL ===== */}
                        <AnimatePresence>
                            {isCancelModalOpen && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setIsCancelModalOpen(false)}
                                        className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100]"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-[40px] shadow-2xl z-[101] overflow-hidden border border-border p-8 space-y-8"
                                    >
                                        <div className="text-center space-y-2">
                                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
                                                <AlertTriangle size={32} />
                                            </div>
                                            <h3 className="text-2xl font-bold text-foreground">Avsluta Medlemskap</h3>
                                            <p className="text-sm text-foreground/50 leading-relaxed">
                                                Vi är trista att se dig gå. Din uppsägning kommer att registreras och medlemskapet avslutas automatiskt efter din bindningstid på {salonData.duration} Månader.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="block text-xs font-bold text-foreground/40 uppercase tracking-widest">Varför vill du sluta? (frivilligt)</label>
                                            <textarea
                                                value={cancellationReason}
                                                onChange={(e) => setCancellationReason(e.target.value)}
                                                className="w-full h-32 px-6 py-4 rounded-3xl bg-foreground/5 border border-transparent focus:border-champagne-300 outline-none transition-all resize-none text-sm"
                                                placeholder="Berätta gärna hur vi kan bli bättre..."
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={handleCancelMembership}
                                                disabled={isCancelling}
                                                className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg flex items-center justify-center gap-2"
                                            >
                                                {isCancelling ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Slutför Uppsägning'}
                                            </button>
                                            <button
                                                onClick={() => setIsCancelModalOpen(false)}
                                                className="px-8 bg-foreground/5 text-foreground/50 rounded-2xl font-bold hover:bg-foreground/10"
                                            >
                                                Behåll
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>


                        {/* ===== LOJALITET TAB ===== */}
                        {activeTab === 'loyalty' && (
                            <div className="space-y-8">
                                {/* Status Card */}
                                <section className={clsx(
                                    "p-8 rounded-3xl shadow-xl relative overflow-hidden transition-colors border",
                                    loyaltyInfo.status === 'active' ? "bg-gradient-to-br from-[#1a1a1a] to-[#111] text-white border-[#333]" :
                                        loyaltyInfo.status === 'deactivating' ? "bg-amber-900 text-white border-amber-800" :
                                            loyaltyInfo.status === 'cooldown' ? "bg-red-900 text-white border-red-800" :
                                                "bg-card text-foreground border-border"
                                )}>
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <Star size={120} strokeWidth={1} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Poängsystem</span>
                                                <h2 className="text-2xl font-bold">
                                                    {loyaltyInfo.status === 'active' && 'Aktivt'}
                                                    {loyaltyInfo.status === 'deactivating' && 'Avstängning pågår'}
                                                    {loyaltyInfo.status === 'cooldown' && 'Cooldown'}
                                                    {loyaltyInfo.status === 'off' && 'Inaktivt'}
                                                </h2>
                                            </div>
                                            <div className={clsx(
                                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                loyaltyInfo.status === 'active' ? "bg-green-400/20 text-green-300" :
                                                    loyaltyInfo.status === 'deactivating' ? "bg-amber-400/20 text-amber-300" :
                                                        loyaltyInfo.status === 'cooldown' ? "bg-red-400/20 text-red-300" :
                                                            "bg-foreground/10 text-foreground/50"
                                            )}>
                                                {loyaltyInfo.status === 'active' ? '● Aktivt' :
                                                    loyaltyInfo.status === 'deactivating' ? '● Avstängs' :
                                                        loyaltyInfo.status === 'cooldown' ? '○ Cooldown' : '○ Av'}
                                            </div>
                                        </div>
                                        <p className="text-sm opacity-70">{loyaltyInfo.message}</p>

                                        {loyaltyInfo.daysUntilAction > 0 && (
                                            <div className="mt-4 flex items-center gap-2">
                                                <Clock size={14} className="opacity-50" />
                                                <span className="text-sm font-bold">{loyaltyInfo.daysUntilAction} dagar kvar</span>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Action Button */}
                                <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-champagne-50 dark:bg-champagne-950 text-champagne-700 dark:text-champagne-400 rounded-lg">
                                            <Star size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-foreground">Hantera poängsystem</h2>
                                            <p className="text-foreground/60 text-xs">Glowbook Loyalty — premium kundlojalitet</p>
                                        </div>
                                    </div>

                                    {loyaltyInfo.canActivate && (
                                        <div className="space-y-4">
                                            <div className="bg-champagne-50/50 dark:bg-champagne-950/20 p-5 rounded-2xl border border-champagne-100 dark:border-champagne-900/30">
                                                <h4 className="font-bold text-foreground text-sm mb-3">Vad händer när du aktiverar?</h4>
                                                <ul className="space-y-2 text-xs text-foreground/60">
                                                    <li className="flex items-start gap-2"><Check size={14} className="text-green-500 mt-0.5 shrink-0" /> Kunder tjänar poäng vid varje genomförd bokning</li>
                                                    <li className="flex items-start gap-2"><Check size={14} className="text-green-500 mt-0.5 shrink-0" /> Ökade återkommande bokningar</li>
                                                    <li className="flex items-start gap-2"><Check size={14} className="text-green-500 mt-0.5 shrink-0" /> Exklusiv medlemskänsla för dina kunder</li>
                                                    <li className="flex items-start gap-2"><Info size={14} className="text-blue-400 mt-0.5 shrink-0" /> Systemet måste vara aktivt i minst {LOYALTY_MIN_ACTIVE_DAYS} dagar</li>
                                                    <li className="flex items-start gap-2"><Info size={14} className="text-blue-400 mt-0.5 shrink-0" /> {LOYALTY_COOLDOWN_DAYS} dagars uppsägningstid vid avstängning</li>
                                                </ul>
                                            </div>
                                            <button
                                                onClick={handleActivateLoyalty}
                                                className="w-full bg-[#111] dark:bg-white text-white dark:text-[#111] py-4 rounded-2xl font-bold hover:bg-champagne-600 dark:hover:bg-champagne-300 transition-all shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <Star size={18} /> Aktivera poängsystem
                                            </button>
                                        </div>
                                    )}

                                    {loyaltyInfo.canDeactivate && (
                                        <div className="space-y-4">
                                            <div className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                                <h4 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                                                    <AlertTriangle size={14} className="text-amber-500" /> Vad händer vid avstängning?
                                                </h4>
                                                <ul className="space-y-2 text-xs text-foreground/60">
                                                    <li>• {LOYALTY_COOLDOWN_DAYS} dagars uppsägningstid startar</li>
                                                    <li>• Under dessa dagar tjänar kunder fortfarande poäng</li>
                                                    <li>• Inga nya poäng efter perioden</li>
                                                    <li>• Befintliga poäng kan alltid användas av kunder</li>
                                                    <li>• {LOYALTY_COOLDOWN_DAYS} dagars cooldown innan du kan aktivera igen</li>
                                                </ul>
                                            </div>
                                            <button
                                                onClick={handleDeactivateLoyalty}
                                                className="w-full border-2 border-red-300 dark:border-red-800 text-red-500 py-4 rounded-2xl font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                Stäng av poängsystem
                                            </button>
                                        </div>
                                    )}

                                    {!loyaltyInfo.canActivate && !loyaltyInfo.canDeactivate && (
                                        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
                                            <Clock size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                            <p className="text-sm text-foreground/60">{loyaltyInfo.message}</p>
                                        </div>
                                    )}
                                </section>

                                {/* How it works */}
                                <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6">
                                    <h3 className="text-lg font-bold text-foreground">Så fungerar Glowbook Loyalty</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { title: 'Poängintjäning', desc: '10 kr = 5 poäng, automatiskt efter genomförd bokning', icon: '⭐' },
                                            { title: 'Reward-nivåer', desc: '150p, 400p, 800p och 1500p med ökande värde', icon: '🎁' },
                                            { title: 'Medlemsnivåer', desc: 'Bronze → Silver → Gold → Diamond baserat på aktivitet', icon: '💎' },
                                            { title: 'Anti-manipulation', desc: '30 dagars minimitid, cooldown och skyddade poäng', icon: '🛡️' },
                                        ].map((item, i) => (
                                            <div key={i} className="p-4 bg-background rounded-2xl border border-border/50">
                                                <div className="text-2xl mb-2">{item.icon}</div>
                                                <h4 className="font-bold text-foreground text-sm mb-1">{item.title}</h4>
                                                <p className="text-xs text-foreground/40">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-foreground/5 p-5 rounded-2xl border border-border/30">
                                        <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-3">Viktiga regler</h4>
                                        <ul className="space-y-2 text-xs text-foreground/50">
                                            <li>✦ Poäng kan inte köpas, överföras eller delas</li>
                                            <li>✦ Redan intjänade poäng kan aldrig raderas</li>
                                            <li>✦ Ingen poäng vid avbokning, no-show eller refund</li>
                                            <li>✦ Du kan ändra framtida regler – men inte retroaktivt</li>
                                        </ul>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* ===== INKORG TAB ===== */}
                        {activeTab === 'inbox' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg">
                                            <MessageSquare size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-foreground">Inkorg</h2>
                                            <p className="text-foreground/50 text-xs">Meddelanden från Glowbook Support & Admin.</p>
                                        </div>
                                    </div>
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={() => {
                                                const updated = notifications.map(n => ({ ...n, read: true }));
                                                setNotifications(updated);
                                                localStorage.setItem('glowbook_provider_notifications', JSON.stringify(updated));
                                            }}
                                            className="text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors"
                                        >
                                            Markera alla som lästa
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {notifications.length === 0 ? (
                                        <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4">
                                            <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto text-foreground/20">
                                                <MessageSquare size={32} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">Din inkorg är tom</p>
                                                <p className="text-sm text-foreground/40 leading-relaxed">
                                                    Här kommer du att se meddelanden från oss, till exempel när din verifiering har granskats.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        notifications.map((n) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key={n.id}
                                                className={clsx(
                                                    "bg-card border p-6 rounded-3xl transition-all relative overflow-hidden",
                                                    !n.read ? "border-blue-500 shadow-blue-500/5 shadow-xl" : "border-border"
                                                )}
                                                onClick={() => markNotificationAsRead(n.id)}
                                            >
                                                {!n.read && (
                                                    <div className="absolute top-0 right-0 p-4">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                    </div>
                                                )}
                                                <div className="flex gap-4">
                                                    <div className={clsx(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                                                        n.type?.includes('approved') ? "bg-green-50 dark:bg-green-950/30 text-green-500" :
                                                            n.type?.includes('rejected') ? "bg-red-50 dark:bg-red-950/30 text-red-500" :
                                                                "bg-blue-50 dark:bg-blue-950/30 text-blue-500"
                                                    )}>
                                                        {n.type?.includes('approved') ? <CheckCircle2 size={24} /> :
                                                            n.type?.includes('rejected') ? <XCircle size={24} /> :
                                                                <Bell size={24} />}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-foreground">{n.title}</h4>
                                                            <span className="text-[10px] text-foreground/30 font-medium">
                                                                {new Date(n.timestamp).toLocaleDateString()} {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-foreground/60 leading-relaxed">{n.message}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ===== BETALNINGAR TAB ===== */}
                        {activeTab === 'payments' && (
                            <div className="space-y-8">
                                <section className="bg-card p-10 rounded-[40px] border border-border shadow-sm space-y-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
                                        <Wallet size={160} strokeWidth={1} />
                                    </div>

                                    <div className="relative z-10 space-y-6">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-3xl font-heading font-bold text-foreground">Betalningar</h2>
                                                    <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[8px] font-black rounded uppercase tracking-widest">Guld-val</span>
                                                </div>
                                                <p className="text-foreground/40 text-sm italic">Aktivera Stripe för att ta emot betalningar direkt vid bokning.</p>
                                            </div>
                                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600">
                                                <CreditCard size={24} />
                                            </div>
                                        </div>

                                        {!salonData.stripeConnected ? (
                                            <div className="p-8 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-card border border-amber-200 dark:border-amber-800/30 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-amber-500/5">
                                                <div className="space-y-4 text-center md:text-left flex-1">
                                                    <div className="w-14 h-14 bg-white dark:bg-amber-900/50 rounded-2xl shadow-inner flex items-center justify-center text-amber-500 mx-auto md:mx-0">
                                                        <Star size={28} fill="currentColor" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-bold text-foreground mb-1">Gör som proffsen</h3>
                                                        <p className="text-sm text-foreground/60 leading-relaxed max-w-md">
                                                            Genom att ansluta ditt företag till Stripe kan dina kunder betala direkt vid bokning. Pengarna landar på ditt konto varje månad. <strong>Glowbook tar 0% provision.</strong>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-4">
                                                    <div className="px-6 py-4 bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl">
                                                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                                            <Clock size={16} /> Beta: Utbetalningar kommer snart
                                                        </p>
                                                        <p className="text-xs text-amber-600/70 mt-1">
                                                            Vi förbereder din salong för direkta utbetalningar. Håll utkik efter en uppdatering inom kort!
                                                        </p>
                                                    </div>
                                                    <button
                                                        disabled
                                                        className="px-10 py-6 bg-foreground/10 text-foreground/20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 cursor-not-allowed border border-border"
                                                    >
                                                        <Plus size={18} /> Stripe Anslutning Pausad
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-emerald-500/5 p-8 rounded-3xl border border-emerald-500/20 flex flex-col md:flex-row items-center gap-6">
                                                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <div className="flex-1 text-center md:text-left space-y-1">
                                                    <h3 className="font-bold text-lg text-foreground">Ansluten till Stripe</h3>
                                                    <p className="text-xs text-emerald-600/70 font-medium">Din salong kan nu ta emot online-betalningar via Glowbook.</p>
                                                </div>
                                                <button className="px-6 py-3 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-champagne-600 hover:text-white transition-all">
                                                    Hantera hos Stripe
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-champagne-50 dark:bg-champagne-950 text-champagne-600 rounded-lg">
                                                <Clock size={18} />
                                            </div>
                                            <h3 className="font-bold text-base text-foreground">Utbetalningsschema</h3>
                                        </div>
                                        <p className="text-xs text-foreground/50 leading-relaxed">
                                            Dina intäkter betalas ut automatiskt till ditt bankkonto den <span className="text-foreground font-bold">25:e varje månad</span>.
                                        </p>
                                        <div className="pt-2">
                                            <span className="text-[10px] font-bold text-champagne-600 bg-champagne-50 dark:bg-champagne-950/30 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                                Nästa utbetalning: 25 Mars
                                            </span>
                                        </div>
                                    </section>

                                    <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-50 dark:bg-purple-950 text-purple-600 rounded-lg">
                                                <Check size={18} />
                                            </div>
                                            <h3 className="font-bold text-base text-foreground">Betalmetoder</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Kortbetalning', 'Klarna', 'Swish', 'Presentkort'].map(method => (
                                                <div key={method} className="flex items-center gap-2 text-[10px] font-bold text-foreground/60">
                                                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                        <Check size={10} />
                                                    </div>
                                                    {method}
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>

                                <section className="bg-amber-500/5 p-8 rounded-3xl border border-amber-500/20 flex gap-4">
                                    <AlertTriangle size={24} className="text-amber-500 shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-foreground">Endast online-betalningar</p>
                                        <p className="text-xs text-foreground/50 leading-relaxed">
                                            Genom att aktivera Stripe Connect bekräftar du att du vill erbjuda online-betalning. Salonger utan ansluten Stripe kan endast erbjuda betalning på plats.
                                        </p>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* ===== NOTISER TAB ===== */}
                        {activeTab === 'notifications' && (
                            <>
                                <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 rounded-lg">
                                            <Bell size={20} />
                                        </div>
                                        <h2 className="text-xl font-bold text-foreground">{t('tab_notifications')}</h2>
                                    </div>
                                    <p className="text-foreground/50 text-sm">{t('desc_notifications_settings')}</p>

                                    <div className="space-y-4">
                                        {[
                                            { label: t('notif_new_bookings'), desc: t('notif_new_bookings_desc'), defaultOn: true },
                                            { label: t('notif_cancellations'), desc: t('notif_cancellations_desc'), defaultOn: true },
                                            { label: t('notif_reminders'), desc: t('notif_reminders_desc'), defaultOn: false },
                                            { label: t('notif_marketing'), desc: t('notif_marketing_desc'), defaultOn: false },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">{item.label}</p>
                                                    <p className="text-xs text-foreground/40">{item.desc}</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" defaultChecked={item.defaultOn} className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-background border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-card after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-foreground transition-colors"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6 mt-8">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-champagne-50 dark:bg-champagne-950/30 text-champagne-700 dark:text-champagne-400 rounded-lg">
                                            <Clock size={20} />
                                        </div>
                                        <h2 className="text-xl font-bold text-foreground">Avbokningspolicy</h2>
                                    </div>
                                    <p className="text-foreground/50 text-sm">Bestäm hur långt innan en behandling som kunder har rätt att själva avboka eller omboka sin tid online.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            { value: 24, label: '24 Timmar', desc: 'Standardpolicy. Ger kunder flexibilitet men skyddar din planering.' },
                                            { value: 48, label: '48 Timmar', desc: 'Mer strikt. Ger dig mer tid att fylla avbokade tider med nya kunder.' }
                                        ].map((policy) => (
                                            <button
                                                key={policy.value}
                                                type="button"
                                                onClick={() => setSalonData({ ...salonData, cancellation_window_hours: policy.value })}
                                                className={clsx(
                                                    "p-6 rounded-2xl border text-left transition-all space-y-2 relative overflow-hidden group",
                                                    (salonData.cancellation_window_hours ?? 24) === policy.value 
                                                        ? "border-champagne-500 bg-champagne-500/5 shadow-md shadow-champagne-500/5" 
                                                        : "border-border hover:border-champagne-300 hover:bg-champagne-500/[0.01]"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-foreground text-base">{policy.label}</span>
                                                    <div className={clsx(
                                                        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                                        (salonData.cancellation_window_hours ?? 24) === policy.value 
                                                            ? "border-champagne-500 bg-champagne-500 text-white" 
                                                            : "border-border bg-card group-hover:border-champagne-300"
                                                    )}>
                                                        {(salonData.cancellation_window_hours ?? 24) === policy.value && <Check size={12} strokeWidth={3} />}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-foreground/50 leading-relaxed font-medium">{policy.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}

                        {/* ===== MARKNADSFÖRING TAB ===== */}
                        {activeTab === 'marketing' && (
                            <div className="space-y-8">
                                <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-8 text-foreground transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 rounded-lg transition-colors">
                                            <Sparkles size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">{t('marketing_title')}</h2>
                                            <p className="text-foreground/50 text-xs">{t('marketing_desc')}</p>
                                        </div>
                                    </div>

                                    {/* Profile Links */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {salonData.tier === 'bas' && (
                                            <div className="space-y-4">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30">{t('profile_link_label')}</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        readOnly
                                                        type="text"
                                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/salon/${salonData.name.toLowerCase().replace(/\s+/g, '-')}`}
                                                        className="flex-1 px-5 py-4 rounded-2xl border border-border bg-[#1a1a1a] text-white text-sm outline-none transition-colors shadow-inner font-medium tracking-wide"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const url = `${window.location.origin}/salon/${salonData.name.toLowerCase().replace(/\s+/g, '-')}`;
                                                            navigator.clipboard.writeText(url);
                                                            setSavedSuccess(true);
                                                            setTimeout(() => setSavedSuccess(false), 2000);
                                                        }}
                                                        className="px-6 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-white/10"
                                                    >
                                                        {t('copy_link_btn')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {salonData.tier !== 'bas' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-champagne-600">Glow-tag (Kort-länk)</label>
                                                    <span className="text-[9px] font-black bg-champagne-500/10 text-champagne-600 px-2 py-0.5 rounded-md uppercase tracking-widest">Premium</span>
                                                </div>
                                                <div className="flex gap-2 p-1.5 bg-gradient-to-r from-champagne-500/5 to-transparent rounded-[24px] border border-champagne-500/10 transition-all hover:border-champagne-500/30">
                                                    <div className="flex-1 flex items-center px-5 py-4 bg-[#111] rounded-[18px] text-white text-sm font-heading font-black tracking-tight border border-white/5 overflow-hidden">
                                                        <span className="opacity-30 mr-1.5">glowbook.se/</span>
                                                        {salonData.slug || (salonData.name ? salonData.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '...')}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const actualSlug = salonData.slug || (salonData.name ? salonData.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
                                                            if (!actualSlug) return;
                                                            const url = `${window.location.origin}/${actualSlug}`;
                                                            navigator.clipboard.writeText(url);
                                                            setSavedSuccess(true);
                                                            setTimeout(() => setSavedSuccess(false), 2000);
                                                        }}
                                                        className="px-8 bg-champagne-500 text-white rounded-[18px] font-black text-xs uppercase tracking-widest hover:bg-champagne-600 transition-all shadow-xl shadow-champagne-500/20 active:scale-95 flex items-center gap-2 group"
                                                    >
                                                        Kopiera
                                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-foreground/30 font-medium px-1">
                                                    Använd din korta länk på Instagram och TikTok för att göra det enkelt för kunder att boka.
                                                </p>
                                            </div>
                                        )}

                                    </div>



                                    <div className="h-4" />

                                    {/* QR Section */}
                                    <div className="bg-card p-10 rounded-[40px] border border-border shadow-sm flex flex-col md:flex-row gap-12 items-center md:items-start">
                                        <div className="w-48 h-48 bg-white p-4 rounded-3xl shadow-xl flex-shrink-0 flex items-center justify-center border border-black/5 overflow-hidden group">
                                            {/* Legit QR Code Generation */}
                                            {(() => {
                                                const actualSlug = salonData.slug || (salonData.name ? salonData.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
                                                const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://glowbook.se';
                                                const finalUrl = salonData.tier !== 'bas'
                                                    ? `${baseUrl}/${actualSlug}`
                                                    : `${baseUrl}/salon/${actualSlug}`;

                                                return (
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(finalUrl)}&margin=10&bgcolor=ffffff&color=000000`}
                                                        alt="Salon QR Code"
                                                        className="w-full h-full object-contain transition-transform group-hover:scale-110 duration-500"
                                                    />
                                                );
                                            })()}
                                        </div>
                                        <div className="space-y-6 flex-1 text-center md:text-left">
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-bold text-foreground">{t('qr_title')}</h3>
                                                <p className="text-sm text-foreground/50 leading-relaxed">{t('qr_desc')}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                                <button 
                                                    onClick={() => {
                                                        const actualSlug = salonData.slug || (salonData.name ? salonData.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
                                                        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://glowbook.se';
                                                        const finalUrl = salonData.tier !== 'bas'
                                                            ? `${baseUrl}/${actualSlug}`
                                                            : `${baseUrl}/salon/${actualSlug}`;
                                                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(finalUrl)}&margin=20&bgcolor=ffffff&color=000000`;
                                                        
                                                        fetch(qrUrl)
                                                            .then(res => res.blob())
                                                            .then(blob => {
                                                                const url = window.URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.style.display = 'none';
                                                                a.href = url;
                                                                a.download = `glowbook-qr-${actualSlug}.png`;
                                                                document.body.appendChild(a);
                                                                a.click();
                                                                window.URL.revokeObjectURL(url);
                                                                document.body.removeChild(a);
                                                            });
                                                    }}
                                                    className="px-8 py-4 bg-foreground text-background rounded-2xl font-bold text-sm hover:scale-[1.02] transition-transform shadow-xl shadow-black/10">
                                                    {t('download_qr')}
                                                </button>

                                            </div>
                                        </div>
                                    </div>
                                </section>

                            </div>
                        )}


                        {/* ===== MALLAR TAB ===== */}
                        {activeTab === 'templates' && (
                            <div className="space-y-8">
                                <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-8 text-foreground transition-colors overflow-hidden">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors">
                                            <ClipboardList size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">{t('templates_title')}</h2>
                                            <p className="text-foreground/50 text-xs">{t('templates_desc')}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {[
                                            { id: 'directions', label: t('templates_label_directions'), placeholder: 'T.ex. Vi ligger 5 min från T-centralen, porten till vänster om Apoteket...' },
                                            { id: 'policy', label: t('templates_label_policy'), placeholder: 'T.ex. Avbokning sker senast 24h innan besöket...' },
                                            { id: 'preparation', label: t('templates_label_preparation'), placeholder: 'T.ex. Kom utan smink till din fransbehandling för bästa resultat...' },
                                        ].map((tpl) => (
                                            <div key={tpl.id} className="space-y-2">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">{tpl.label}</label>
                                                <div className="relative group">
                                                    <textarea
                                                        placeholder={tpl.placeholder}
                                                        className="w-full p-5 rounded-2xl border border-border bg-background text-sm outline-none focus:border-champagne-500 transition-all min-h-[120px] resize-none pr-12 transition-colors"
                                                    />
                                                    <div className="absolute top-4 right-4 text-foreground/10 group-focus-within:text-champagne-500 transition-colors">
                                                        <Save size={18} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/10 flex items-start gap-4 transition-colors">
                                            <div className="p-1.5 bg-emerald-500 text-white rounded-full shrink-0"><Check size={12} /></div>
                                            <p className="text-xs text-emerald-800/70 dark:text-emerald-300/60 leading-relaxed italic font-medium">
                                                Dessa mallar kan skickas med ett klick via chatten eller skickas automatiskt i bokningsbekräftelsen om du har Premium-paket.
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setSavedSuccess(true);
                                                setTimeout(() => setSavedSuccess(false), 2000);
                                            }}
                                            className="w-full py-5 bg-[#111] dark:bg-white text-white dark:text-[#111] rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-champagne-600 hover:text-white transition-all shadow-xl active:scale-95 font-body"
                                        >
                                            {t('templates_save_btn')}
                                        </button>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* ===== UTFÖRARE TAB (LUXE ONLY) ===== */}
                        {activeTab === 'practitioners' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-8 text-foreground transition-colors overflow-hidden">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold">{t('practitioners_title')}</h2>
                                                <p className="text-foreground/50 dark:text-white/60 text-xs">
                                                    {salonData.tier === 'bas'
                                                        ? 'BAS-planen är begränsad till en (1) utförare.'
                                                        : t('practitioners_desc')}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (salonData.tier !== 'luxe' && (salonData.practitioners?.length || 0) >= 1) {
                                                    alert("Du behöver uppgradera till LUXE för att lägga till fler än en utövare.");
                                                    setActiveTab('membership');
                                                } else {
                                                    setEditingPractitionerId(null);
                                                    setNewPractitioner({ name: '', role: '', title: '', categories: [], image: '' });
                                                    setIsAddPractitionerModalOpen(true);
                                                }
                                            }}
                                            className={clsx(
                                                "px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2",
                                                salonData.tier !== 'luxe' && (salonData.practitioners?.length || 0) >= 1
                                                    ? "bg-foreground/10 text-foreground/30 cursor-not-allowed"
                                                    : "bg-foreground text-background"
                                            )}
                                        >
                                            <Plus size={16} /> {t('practitioners_add_btn')}
                                            {salonData.tier !== 'luxe' && (salonData.practitioners?.length || 0) >= 1 && (
                                                <span className="ml-1 text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full ring-2 ring-card">LUXE krävs</span>
                                            )}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        {salonData.practitioners.length > 0 ? (
                                            salonData.practitioners.map((p: any) => (
                                                <div key={p.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    <div className="p-6 rounded-[32px] border border-border bg-foreground/[0.02] flex items-center justify-between group hover:border-blue-500/30 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            {p.image ? (
                                                                <img src={p.image} alt={p.name} className="w-14 h-14 rounded-2xl object-cover shadow-lg shadow-blue-500/10" />
                                                            ) : (
                                                                <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/10">
                                                                    {p.name.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <h4 className="font-bold text-lg">{p.name}</h4>
                                                                <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-[0.2em]">{p.title || p.role}</p>
                                                                {p.title && p.role && p.title !== p.role && <p className="text-[9px] text-foreground/25 font-medium">{p.role}</p>}
                                                                {(p.categories && p.categories.length > 0) && (
                                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                                        {p.categories.map((cat: string) => (
                                                                            <span key={cat} className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[9px] font-bold rounded-md uppercase tracking-wider">
                                                                                {cat}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingPractitionerId(p.id);
                                                                    setNewPractitioner({
                                                                        name: p.name,
                                                                        role: p.role,
                                                                        title: p.title,
                                                                        categories: p.categories || [],
                                                                        image: p.image || ''
                                                                    });
                                                                    setIsAddPractitionerModalOpen(true);
                                                                }}
                                                                className="p-3 text-foreground/20 hover:text-blue-500 transition-colors bg-foreground/5 rounded-xl"
                                                                title="Redigera Profil"
                                                            >
                                                                <User size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (managingScheduleId === p.id) {
                                                                        setManagingScheduleId(null);
                                                                    } else {
                                                                        setManagingScheduleId(p.id);
                                                                        setScheduleBuffer(p.schedule || {});
                                                                    }
                                                                }}
                                                                className={clsx(
                                                                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                    managingScheduleId === p.id ? "bg-blue-500 text-white" : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10"
                                                                )}
                                                            >
                                                                {managingScheduleId === p.id ? 'Stäng Schema' : 'Hantera Schema'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const updated = {
                                                                        ...salonData,
                                                                        practitioners: salonData.practitioners.filter((ptr: any) => ptr.id !== p.id)
                                                                    };
                                                                    setSalonData(updated);
                                                                    localStorage.setItem('glowbook_salon', JSON.stringify(updated));
                                                                }}
                                                                className="p-3 text-foreground/20 hover:text-red-500 transition-colors bg-foreground/5 rounded-xl"
                                                            >
                                                                <Plus size={18} className="rotate-45" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                </div>

                                            ))
                                        ) : (
                                            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-foreground/[0.02] rounded-[32px] border border-dashed border-border">
                                                <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center text-foreground/20">
                                                    <Users size={32} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-bold text-foreground">Ingen personal tillagd</p>
                                                    <p className="text-xs text-foreground/40">Lägg till dina kollegor för att komma igång.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 bg-blue-50/50 dark:bg-blue-600/10 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                                        <p className="text-[11px] text-blue-800/70 dark:text-blue-100 leading-relaxed italic font-medium">
                                            Som LUXE-användare kan du Lägga till obegränsat antal utförare. Kunder kommer se dessa val när de väljer behandling.
                                        </p>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </div >

                {/* Auto-save floating indicator */}
                {(isSaving || saveStatus !== 'idle') && (
                    <div className="fixed bottom-10 right-10 z-[100]">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={clsx(
                                "flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold shadow-xl",
                                saveStatus === 'success' ? "bg-emerald-500 text-white"
                                : saveStatus === 'error' ? "bg-red-500 text-white"
                                : "bg-[#111] text-white"
                            )}
                        >
                            {isSaving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {!isSaving && saveStatus === 'success' && <Check size={14} strokeWidth={3} />}
                            {!isSaving && saveStatus === 'error' && <X size={14} strokeWidth={3} />}
                            {isSaving ? 'Sparar...' : saveStatus === 'success' ? 'Sparat!' : errorMessage || 'Fel'}
                        </motion.div>
                    </div>
                )}
            </main >

            {/* Verification Modal */}
            <AnimatePresence>
                {
                    isVerificationModalOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsVerificationModalOpen(false)}
                                className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200]"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-[40px] shadow-2xl z-[201] overflow-hidden border border-border p-10 space-y-8"
                            >
                                <div className="text-center space-y-2">
                                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <Shield size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold font-heading">{t('verification_modal_title')}</h3>
                                    <p className="text-sm text-foreground/50 leading-relaxed">
                                        {t('verification_modal_desc')}
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <label className="block p-10 border-2 border-dashed border-border rounded-[32px] hover:border-blue-500/50 transition-all cursor-pointer group bg-foreground/[0.02]">
                                        <input
                                            type="file"
                                            className="sr-only"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setUploadedDiploma(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                        <div className="flex flex-col items-center gap-3 text-foreground/30 group-hover:text-blue-500 transition-colors">
                                            {uploadedDiploma ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <CheckCircle2 size={32} className="text-green-500" />
                                                    <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Fil vald</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload size={32} />
                                                    <div className="text-center">
                                                        <p className="text-xs font-bold uppercase tracking-widest">{t('verification_upload_btn')}</p>
                                                        <p className="text-[10px] opacity-60 mt-1">PDF, JPG eller PNG (Max 5MB)</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </label>

                                    <div className="p-5 bg-foreground/[0.03] rounded-2xl flex gap-4 items-start border border-border">
                                        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-foreground/40 font-medium leading-relaxed italic">
                                            När du är verifierad kommer en blå badge visas på din offentliga profil. Detta ökar chansen för bokningar med upp till 40%.
                                        </p>
                                    </div>
                                    <button
                                        disabled={!uploadedDiploma || isSubmittingVerification}
                                        onClick={() => {
                                            setIsSubmittingVerification(true);
                                            setTimeout(() => {
                                                const updatedSalonState = {
                                                    ...salonData,
                                                    verificationStatus: 'pending' as const,
                                                    id: salonData.id || (salonData.name ? salonData.name.toLowerCase().replace(/\s+/g, '-') : `salon-${Date.now()}`)
                                                };
                                                setSalonData(updatedSalonState);
                                                localStorage.setItem('glowbook_salon', JSON.stringify(updatedSalonState));

                                                const existingRequests = JSON.parse(localStorage.getItem('glowbook_verification_requests') || '[]');
                                                const request = {
                                                    id: `ver_${Date.now()}`,
                                                    providerName: salonData.name || 'Okänd',
                                                    salonName: (salonData as any).salon || salonData.name || 'Okänd salong',
                                                    email: salonData.email || '',
                                                    diplomaFile: uploadedDiploma,
                                                    submittedAt: new Date().toISOString(),
                                                    status: 'pending' as const,
                                                    categories: salonData.practitioners?.flatMap((p: any) => p.categories || []) || []
                                                };
                                                localStorage.setItem('glowbook_verification_requests', JSON.stringify([...existingRequests, request]));

                                                setIsVerificationModalOpen(false);
                                                setIsSubmittingVerification(false);
                                                setUploadedDiploma(null);
                                                setSavedSuccess(true);
                                                setTimeout(() => setSavedSuccess(false), 3000);
                                                window.dispatchEvent(new Event('glowbook_update'));
                                            }, 2000);
                                        }}
                                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                                    >
                                        {isSubmittingVerification ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                        ) : (
                                            t('verification_submit_btn') || 'Skicka för granskning'
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )
                }
            </AnimatePresence >

            {/* Add Practitioner Modal */}
            <AnimatePresence>
                {
                    isAddPractitionerModalOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsAddPractitionerModalOpen(false)}
                                className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200]"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-[40px] shadow-2xl z-[201] overflow-hidden border border-border"
                            >
                                <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold">{editingPractitionerId ? 'Redigera utförare' : 'Lägg till utförare'}</h3>
                                        <p className="text-white/60 text-xs">Personalen synas i bokningsflödet baserat på titel</p>
                                    </div>
                                    <button onClick={() => {
                                        setIsAddPractitionerModalOpen(false);
                                        setEditingPractitionerId(null);
                                        setNewPractitioner({ name: '', role: '', title: '', categories: [], image: '' });
                                    }} className="hover:rotate-90 transition-transform"><Plus size={24} className="rotate-45" /></button>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-2">Fullständigt namn</label>
                                            <input
                                                type="text"
                                                value={newPractitioner.name}
                                                onChange={(e) => setNewPractitioner({ ...newPractitioner, name: e.target.value })}
                                                className="w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-blue-500 outline-none transition-all placeholder:text-foreground/20"
                                                placeholder="T.ex. Maria Nilsson"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-2">Yrkestitel</label>
                                            <div className="relative">
                                                <select
                                                    value={newPractitioner.title}
                                                    onChange={(e) => setNewPractitioner({ ...newPractitioner, title: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-blue-500 outline-none transition-all text-foreground appearance-none cursor-pointer"
                                                >
                                                    <option value="" className="bg-card">Välj primär yrkestitel...</option>
                                                    <option value="Frisör" className="bg-card">Frisör</option>
                                                    <option value="Barberare" className="bg-card">Barberare</option>
                                                    <option value="Fransstylist" className="bg-card">Fransstylist</option>
                                                    <option value="Nagelterapeut" className="bg-card">Nagelterapeut</option>
                                                    <option value="Hudterapeut" className="bg-card">Hudterapeut</option>
                                                    <option value="Massör" className="bg-card">Massör / Massageterapeut</option>
                                                    <option value="Makeup-artist" className="bg-card">Makeup-artist</option>
                                                    <option value="Brow stylist" className="bg-card">Brow stylist</option>
                                                    <option value="Tatuerare" className="bg-card">Tatuerare</option>
                                                    <option value="Piercing" className="bg-card">Piercing</option>
                                                    <option value="Kiropraktor" className="bg-card">Kiropraktor</option>
                                                    <option value="Naprapat" className="bg-card">Naprapat</option>
                                                    <option value="Tandblekare" className="bg-card">Tandblekare</option>
                                                    <option value="Estetisk Injektionsspecialist" className="bg-card">Estetisk Injektionsspecialist</option>
                                                    <option value="SPA-terapeut" className="bg-card">SPA-terapeut</option>
                                                    <option value="Lasertekniker" className="bg-card">Lasertekniker</option>
                                                    <option value="Fotvårdsterapeut" className="bg-card">Fotvårdsterapeut</option>
                                                    <option value="Personal" className="bg-card">Övrig personal</option>
                                                </select>
                                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none" size={18} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-2">Specialiseringar / Kategorier</label>
                                            <p className="text-[10px] text-foreground/50 mb-2 leading-relaxed">Välj allt som utövaren kan erbjuda. Detta påverkar sökresultat för kunder.</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['Frisör', 'Barberare', 'Fransstylist', 'Nagelterapeut', 'Hudterapeut', 'Massör', 'Makeup-artist', 'Brow stylist', 'Tatuerare', 'Piercing', 'Kiropraktor', 'Naprapat', 'Tandblekning', 'Estetisk Injektion', 'Spa', 'Lasertekniker', 'Fotvårdsterapeut'].map(cat => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => {
                                                            const cats = newPractitioner.categories || [];
                                                            setNewPractitioner({
                                                                ...newPractitioner,
                                                                categories: cats.includes(cat)
                                                                    ? cats.filter(c => c !== cat)
                                                                    : [...cats, cat]
                                                            });
                                                        }}
                                                        className={clsx(
                                                            "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                                                            (newPractitioner.categories || []).includes(cat)
                                                                ? "bg-violet-600 text-white border-violet-600 shadow-md"
                                                                : "bg-foreground/5 text-foreground/40 border-border hover:border-violet-300 hover:text-violet-500"
                                                        )}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-2">Beskrivning / Specialisering (valfritt)</label>
                                            <input
                                                type="text"
                                                value={newPractitioner.role}
                                                onChange={(e) => setNewPractitioner({ ...newPractitioner, role: e.target.value })}
                                                className="w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-blue-500 outline-none transition-all placeholder:text-foreground/20"
                                                placeholder="T.ex. Specialiserad på balayage"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-2">Profilbilds-URL (valfritt)</label>
                                            <input
                                                type="text"
                                                value={newPractitioner.image}
                                                onChange={(e) => setNewPractitioner({ ...newPractitioner, image: e.target.value })}
                                                className="w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-border focus:border-blue-500 outline-none transition-all placeholder:text-foreground/20 text-xs"
                                                placeholder="Klistra in bildlänk (t.ex. https://image.com/my-pic.jpg)"
                                            />
                                            {newPractitioner.image && (
                                                <div className="mt-3 flex items-center gap-3 bg-foreground/5 p-3 rounded-2xl border border-border">
                                                    <img src={newPractitioner.image} alt="Preview" className="w-10 h-10 rounded-full object-cover shadow-md" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                                                    <span className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider">Förhandsvisning</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                        <p className="text-[10px] text-blue-600 dark:text-blue-300 font-medium leading-relaxed">
                                            <strong className="text-blue-700 dark:text-blue-200 uppercase font-black tracking-tighter mr-1">Tips:</strong> Yrkestiteln avgör vilka tjänster som visas för kunden. En &quot;Fransstylist&quot; kopplas automatiskt till franstjänster, inte klippning.
                                        </p>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => {
                                            if (!newPractitioner.name || !newPractitioner.title) return;

                                            if (editingPractitionerId) {
                                                // Update existing
                                                const updatedPractitioners = salonData.practitioners.map((ptr: any) =>
                                                    ptr.id === editingPractitionerId
                                                        ? {
                                                            ...ptr,
                                                            name: newPractitioner.name,
                                                            title: newPractitioner.title,
                                                            role: newPractitioner.role || newPractitioner.title,
                                                            categories: newPractitioner.categories.length > 0 ? newPractitioner.categories : [newPractitioner.title],
                                                            image: newPractitioner.image
                                                        }
                                                        : ptr
                                                );
                                                const updated = { ...salonData, practitioners: updatedPractitioners };
                                                setSalonData(updated as any);
                                                localStorage.setItem('glowbook_salon', JSON.stringify(updated));
                                                setEditingPractitionerId(null);
                                            } else {
                                                // Create new
                                                const p = {
                                                    id: crypto.randomUUID(),
                                                    name: newPractitioner.name,
                                                    title: newPractitioner.title,
                                                    role: newPractitioner.role || newPractitioner.title,
                                                    image: newPractitioner.image,
                                                    schedule: {},
                                                    status: 'active',
                                                    categories: newPractitioner.categories.length > 0 ? newPractitioner.categories : [newPractitioner.title]
                                                };
                                                const updated = {
                                                    ...salonData,
                                                    practitioners: [...(salonData.practitioners || []), p]
                                                };
                                                setSalonData(updated as any);
                                                localStorage.setItem('glowbook_salon', JSON.stringify(updated));
                                            }

                                            setIsAddPractitionerModalOpen(false);
                                            setNewPractitioner({ name: '', role: '', title: '', categories: [], image: '' });
                                            setSavedSuccess(true);
                                            setTimeout(() => setSavedSuccess(false), 2000);
                                        }}
                                        disabled={!newPractitioner.name || !newPractitioner.title}
                                        className={clsx(
                                            "w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all font-body",
                                            newPractitioner.name && newPractitioner.title
                                                ? (editingPractitionerId ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-blue-600 text-white hover:bg-blue-700")
                                                : "bg-foreground/10 text-foreground/30 cursor-not-allowed"
                                        )}
                                    >
                                        {editingPractitionerId ? 'Spara ändringar' : 'Lägg till personal'}
                                    </motion.button>
                                </div>
                            </motion.div>
                        </>
                    )
                }
            </AnimatePresence >

            {/* Schedule Edit Modal - uses extracted component */}
            <AnimatePresence>
                {
                    managingScheduleId && (() => {
                        const practitioner = salonData.practitioners.find(p => p.id === managingScheduleId);
                        if (!practitioner) return null;
                        return (
                            <WeeklyScheduleGrid
                                practitioner={practitioner}
                                appointments={salonData.appointments || []}
                                onClose={() => setManagingScheduleId(null)}
                                onSave={(normalized) => {
                                    const updatedPractitioners = salonData.practitioners.map((ptr: any) =>
                                        ptr.id === managingScheduleId ? { ...ptr, schedule: normalized } : ptr
                                    );
                                    const updated = { ...salonData, practitioners: updatedPractitioners };
                                    setSalonData(updated as any);
                                    localStorage.setItem('glowbook_salon', JSON.stringify(updated));
                                    setManagingScheduleId(null);
                                    setSavedSuccess(true);
                                    setTimeout(() => setSavedSuccess(false), 2000);
                                }}
                            />
                        );
                    })()
                }
            </AnimatePresence>

        </div>
    );
}

