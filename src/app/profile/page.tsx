
'use client';

import Header from "@/components/layout/Header";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
    User, Settings, Calendar, Star, CreditCard, Mail, Phone, Lock,
    ChevronRight, LogOut, Gift, Eye, EyeOff, Check, AlertCircle,
    Clock, MapPin, Sparkles, ArrowRight, Shield, Award, Crown, Gem,
    Trophy, ChevronDown, X, Scissors, Eraser, Banknote, Palette, Flame
} from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
    MEMBER_LEVELS, REWARD_TIERS, getMemberLevel, getNextLevel,
    getLevelProgress, getPointsToNextLevel, getAvailableRewardsAtProvider,
    getProvidersWithPoints,
    type MemberLevelInfo, type RewardTier, type RewardOption,
    type PointTransaction, type CustomerLoyaltyData, type ProviderPointBalance,
    getDefaultCustomerLoyalty
} from "@/lib/loyalty";

type Booking = {
    id: string;
    service: string;
    provider: string;
    date: string;
    time: string;
    price: number;
    status: 'upcoming' | 'completed' | 'cancelled';
};

type CustomerProfile = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    bankDetails?: {
        cardLast4: string;
        cardBrand: string;
        expiryDate: string;
    };
};

const DEMO_BOOKINGS: Booking[] = [
    { id: 'b1', service: 'Gelénaglar', provider: 'Luxe by Essi', date: '2026-02-20', time: '14:00', price: 599, status: 'upcoming' },
    { id: 'b2', service: 'Fransförlängning', provider: 'Lash Studio', date: '2026-02-15', time: '10:30', price: 899, status: 'upcoming' },
    { id: 'b3', service: 'Klassisk massage 60min', provider: 'Zen Massage', date: '2026-01-28', time: '16:00', price: 749, status: 'completed' },
    { id: 'b4', service: 'Ansiktsbehandling', provider: 'Skin by Sara', date: '2026-01-10', time: '11:00', price: 1199, status: 'completed' },
];

const DEMO_TRANSACTIONS: PointTransaction[] = [
    { id: 't1', type: 'earned', amount: 300, description: 'Gelénaglar', date: '2026-01-10', providerId: 'luxe-by-essi', providerName: 'Luxe by Essi', bookingId: 'b4' },
    { id: 't2', type: 'earned', amount: 375, description: 'Massage', date: '2026-01-28', providerId: 'zen-massage', providerName: 'Zen Massage', bookingId: 'b3' },
    { id: 't3', type: 'earned', amount: 600, description: 'Ansiktsbehandling', date: '2026-01-10', providerId: 'skin-by-sara', providerName: 'Skin by Sara', bookingId: 'b4' },
    { id: 't4', type: 'spent', amount: -150, description: 'Reward: 50 kr rabatt', date: '2026-02-01', providerId: 'luxe-by-essi', providerName: 'Luxe by Essi', rewardId: 'r150_3' },
];

type Tab = 'overview' | 'bookings' | 'rewards' | 'settings';

// Member level icons
function LevelIcon({ level, size = 20 }: { level: string; size?: number }) {
    switch (level) {
        case 'bronze': return <Award size={size} />;
        case 'silver': return <Star size={size} />;
        case 'gold': return <Trophy size={size} />;
        case 'diamond': return <Gem size={size} />;
        default: return <Award size={size} />;
    }
}

// Level badge component
function MemberBadge({ level, size = 'md' }: { level: MemberLevelInfo; size?: 'sm' | 'md' | 'lg' }) {
    const sizes = {
        sm: 'px-2.5 py-1 text-[10px] gap-1',
        md: 'px-3.5 py-1.5 text-xs gap-1.5',
        lg: 'px-5 py-2 text-sm gap-2',
    };
    return (
        <span className={clsx(
            `inline-flex items-center font-bold rounded-full bg-gradient-to-r ${level.gradient} text-white shadow-md`,
            sizes[size]
        )}>
            <LevelIcon level={level.key} size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} />
            {level.label}
        </span>
    );
}

function DynamicIcon({ name, size = 20 }: { name: string; size?: number }) {
    switch (name) {
        case 'Scissors': return <Scissors size={size} />;
        case 'Eraser': return <Eraser size={size} />;
        case 'Banknote': return <Banknote size={size} />;
        case 'Sparkles': return <Sparkles size={size} />;
        case 'Gift': return <Gift size={size} />;
        case 'Star': return <Star size={size} />;
        case 'Palette': return <Palette size={size} />;
        case 'Crown': return <Crown size={size} />;
        case 'Flame': return <Flame size={size} />;
        case 'Gem': return <Gem size={size} />;
        case 'Award': return <Award size={size} />;
        default: return <Star size={size} />;
    }
}

export default function ProfilePage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [profile, setProfile] = useState<CustomerProfile>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    });
    const [loyalty, setLoyalty] = useState<CustomerLoyaltyData>(getDefaultCustomerLoyalty());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [savedMsg, setSavedMsg] = useState('');
    const [passwordData, setPasswordData] = useState({ current: '', newPass: '', confirm: '' });
    const [selectedReward, setSelectedReward] = useState<{ tier: RewardTier; option: RewardOption } | null>(null);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showCardModal, setShowCardModal] = useState(false);
    const [cardForm, setCardForm] = useState({ number: '', expiry: '', cvc: '', name: '' });
    const [cancellingBooking, setCancellingBooking] = useState<string | null>(null);

    const memberLevel = getMemberLevel(loyalty.totalPointsEarned);
    const nextLevel = getNextLevel(loyalty.totalPointsEarned);
    const progress = getLevelProgress(loyalty.totalPointsEarned);
    const pointsToNext = getPointsToNextLevel(loyalty.totalPointsEarned);
    const totalCurrentPoints = loyalty.providerBalances.reduce((sum, b) => sum + b.currentPoints, 0);
    const providersWithPoints = getProvidersWithPoints(loyalty);
    const allTransactions = loyalty.providerBalances.flatMap(b => b.transactions).sort((a, b) => b.date.localeCompare(a.date));

    // Load profile from localStorage and sync with Supabase
    useEffect(() => {
        const checkAuth = async () => {
            const saved = localStorage.getItem('glowbook_customer');
            if (!saved) {
                router.push('/auth/login');
                return;
            }

            try {
                const data = JSON.parse(saved);
                setProfile({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    bankDetails: data.bankDetails
                });

                if (data.id) {
                    // Fetch real loyalty data from Supabase
                    const response = await fetch('/api/profile/loyalty', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: data.id }),
                    });
                    const loyaltyData = await response.json();

                    if (loyaltyData.success) {
                        const level = getMemberLevel(loyaltyData.totalPointsEarned);

                        // Map transactions to balances as expected by the frontend lib
                        const mappedBalances: ProviderPointBalance[] = loyaltyData.balances.map((b: any) => ({
                            ...b,
                            totalPointsEarned: b.totalEarned,
                            transactions: loyaltyData.transactions.filter((t: any) => t.providerId === b.providerId),
                            redeemedRewards: b.redeemedRewards || []
                        }));

                        setLoyalty({
                            totalPointsEarned: loyaltyData.totalPointsEarned,
                            memberLevel: level.key,
                            providerBalances: mappedBalances
                        });
                    }

                    // 2. Fetch real bookings
                    const bookingsResponse = await fetch('/api/bookings/user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: data.id, email: data.email }),
                    });
                    const bookingsData = await bookingsResponse.json();
                    if (bookingsData.success) {
                        setBookings(bookingsData.bookings);
                    }
                }
            } catch (err) {
                console.error('Auth/Loyalty check error:', err);
            }
        };
        checkAuth();
    }, [router]);

    // Don't render until we have profile data (prevents flashes)
    if (!profile.firstName) return null;

    const handleLogout = () => {
        localStorage.clear();
        window.dispatchEvent(new Event('glowbook_update'));
        router.push('/auth/login');
    };

    const saveProfile = (updates: Partial<CustomerProfile>) => {
        const updated = { ...profile, ...updates };
        setProfile(updated);
        localStorage.setItem('glowbook_customer', JSON.stringify(updated));
        setSavedMsg('Ändringar sparade!');
        setTimeout(() => setSavedMsg(''), 2000);
    };

    const handleRedeemReward = async (tier: RewardTier, option: RewardOption, providerId: string) => {
        const balance = loyalty.providerBalances.find(b => b.providerId === providerId);
        if (!balance || balance.currentPoints < tier.pointsCost) return;

        const userId = JSON.parse(localStorage.getItem('glowbook_customer') || '{}').id;

        try {
            const response = await fetch('/api/loyalty/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    salonId: providerId,
                    pointsCost: tier.pointsCost,
                    rewardId: option.id,
                    description: `Reward: ${option.label}`
                }),
            });

            const data = await response.json();

            if (data.success) {
                const newTransaction: PointTransaction = {
                    id: `t_${Date.now()}`,
                    type: 'spent',
                    amount: -tier.pointsCost,
                    description: `Reward: ${option.label}`,
                    date: new Date().toISOString(),
                    providerId,
                    providerName: balance.providerName,
                    rewardId: option.id,
                };

                const updatedBalances = loyalty.providerBalances.map(b =>
                    b.providerId === providerId
                        ? {
                            ...b,
                            currentPoints: data.newBalance,
                            transactions: [newTransaction, ...b.transactions],
                            redeemedRewards: [...b.redeemedRewards, option.id],
                        }
                        : b
                );

                const updated: CustomerLoyaltyData = {
                    ...loyalty,
                    providerBalances: updatedBalances,
                };
                setLoyalty(updated);
                setShowRewardModal(false);
                setSelectedReward(null);
                setSavedMsg(`${option.label} aktiverad!`);
                setTimeout(() => setSavedMsg(''), 3000);
            } else {
                setSavedMsg(data.error || 'Reward kunde inte aktiveras.');
                setTimeout(() => setSavedMsg(''), 3000);
            }
        } catch (error) {
            console.error('Redeem reward error:', error);
            setSavedMsg('Ett tekniskt fel uppstod.');
            setTimeout(() => setSavedMsg(''), 3000);
        }
    };

    const handlePasswordChange = () => {
        if (!passwordData.current) {
            setSavedMsg('Fyll i ditt nuvarande lösenord');
            setTimeout(() => setSavedMsg(''), 3000);
            return;
        }
        if (passwordData.newPass !== passwordData.confirm) {
            setSavedMsg('Lösenorden matchar inte');
            setTimeout(() => setSavedMsg(''), 3000);
            return;
        }
        if (passwordData.newPass.length < 6) {
            setSavedMsg('Lösenordet måste vara minst 6 tecken');
            setTimeout(() => setSavedMsg(''), 3000);
            return;
        }
        setSavedMsg('Lösenord uppdaterat!');
        setPasswordData({ current: '', newPass: '', confirm: '' });
        setTimeout(() => setSavedMsg(''), 3000);
    };

    const handleCancelBooking = async (bookingId: string) => {
        try {
            const response = await fetch('/api/bookings/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId }),
            });
            const data = await response.json();
            if (!data.success) {
                alert('Kunde inte avboka: ' + data.error);
                return;
            }

            setCancellingBooking(null);
            const updated = bookings.map(b =>
                b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
            );
            setBookings(updated);

            // Sync legacy localStorage if present
            const localBookings = localStorage.getItem('glowbook_bookings');
            if (localBookings) {
                const parsed = JSON.parse(localBookings);
                const updatedLocal = parsed.map((b: any) => b.id === bookingId ? { ...b, status: 'cancelled' } : b);
                localStorage.setItem('glowbook_bookings', JSON.stringify(updatedLocal));
            }

            setSavedMsg('Bokningen har avbokats');
            setTimeout(() => setSavedMsg(''), 3000);
            window.dispatchEvent(new Event('glowbook_update'));
        } catch (e) {
            console.error('Cancel error:', e);
            alert('Ett fel uppstod vid avbokning.');
        }
    };

    const handleAddCard = () => {
        if (!cardForm.number || !cardForm.expiry || !cardForm.cvc) {
            setSavedMsg('Fyll i alla kortuppgifter');
            setTimeout(() => setSavedMsg(''), 3000);
            return;
        }
        const last4 = cardForm.number.replace(/\s/g, '').slice(-4);
        const firstDigit = cardForm.number.replace(/\s/g, '')[0];
        const brand = firstDigit === '4' ? 'Visa' : firstDigit === '5' ? 'Mastercard' : 'Kort';
        const updated = {
            ...profile,
            bankDetails: {
                cardLast4: last4,
                cardBrand: brand,
                expiryDate: cardForm.expiry,
            }
        };
        setProfile(updated);
        localStorage.setItem('glowbook_customer', JSON.stringify(updated));
        setShowCardModal(false);
        setCardForm({ number: '', expiry: '', cvc: '', name: '' });
        setSavedMsg('Kort tillagt!');
        setTimeout(() => setSavedMsg(''), 3000);
    };

    const handleRemoveCard = () => {
        const { bankDetails, ...rest } = profile as any;
        const updated = rest as CustomerProfile;
        setProfile(updated);
        localStorage.setItem('glowbook_customer', JSON.stringify(updated));
        setSavedMsg('Kortet har tagits bort');
        setTimeout(() => setSavedMsg(''), 3000);
    };

    const upcomingBookings = bookings.filter(b => b.status === 'upcoming');
    const pastBookings = bookings.filter(b => b.status !== 'upcoming');

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'overview', label: 'Översikt', icon: <Sparkles size={18} /> },
        { key: 'bookings', label: 'Bokningar', icon: <Calendar size={18} /> },
        { key: 'rewards', label: 'Rewards', icon: <Gift size={18} /> },
        { key: 'settings', label: 'Inställningar', icon: <Settings size={18} /> },
    ];

    const inputClass = "w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-champagne-500 outline-none transition-all text-sm font-medium text-foreground placeholder:text-foreground/20";

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-outfit transition-colors duration-500">
            <Header />

            <main className="flex-1 px-6 pt-28 pb-24">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* ═══ Profile Header ═══ */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-6"
                    >
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-champagne-400 to-champagne-600 flex items-center justify-center text-white text-2xl font-heading font-bold shadow-lg">
                                {profile.firstName[0]}{profile.lastName[0]}
                            </div>
                            {/* Level badge on avatar */}
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md"
                                style={{ background: memberLevel.color }}>
                                <LevelIcon level={memberLevel.key} size={14} />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-heading font-bold text-foreground">
                                    {profile.firstName} {profile.lastName}
                                </h1>
                                <MemberBadge level={memberLevel} size="sm" />
                            </div>
                            <p className="text-black/40 dark:text-white/40 text-sm">{profile.email}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5 text-champagne-600">
                                    <Star size={14} className="fill-champagne-500" />
                                    <span className="text-sm font-bold">{totalCurrentPoints.toLocaleString()} poäng</span>
                                </div>
                                {nextLevel && (
                                    <>
                                        <span className="text-black/10 dark:text-white/10">|</span>
                                        <span className="text-xs text-black/40 dark:text-white/40">{pointsToNext}p till {nextLevel.label}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <Link
                            href="/explore"
                            className="hidden md:inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-champagne-600 text-white rounded-full text-sm font-bold hover:bg-champagne-600 transition-all shadow-md"
                        >
                            Boka tid <ArrowRight size={14} />
                        </Link>
                    </motion.div>

                    {/* ═══ Tab Navigation ═══ */}
                    <div className="flex gap-1 bg-white dark:bg-[#141414] p-1.5 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                    activeTab === tab.key
                                        ? "bg-black dark:bg-champagne-600 text-white shadow-md"
                                        : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                                )}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Toast */}
                    <AnimatePresence>
                        {savedMsg && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl text-sm font-medium"
                            >
                                <Check size={16} /> {savedMsg}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ═══ Tab Content ═══ */}
                    <AnimatePresence mode="wait">

                        {/* ─── OVERVIEW ─── */}
                        {activeTab === 'overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

                                {/* Member Level Card */}
                                <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-2xl p-8 text-white shadow-xl border border-white/5 relative overflow-hidden">
                                    {/* Decorative */}
                                    <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20"
                                        style={{ background: memberLevel.color }} />

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                                                    style={{ background: `linear-gradient(135deg, ${memberLevel.color}40, ${memberLevel.color}20)` }}>
                                                    <LevelIcon level={memberLevel.key} size={28} />
                                                </div>
                                                <div>
                                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Medlemsnivå</p>
                                                    <h3 className="text-2xl font-heading font-bold" style={{ color: memberLevel.color }}>
                                                        {memberLevel.label} Member
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white/30 text-[10px] uppercase tracking-widest">Poängsaldo</p>
                                                <p className="text-2xl font-bold text-white">{totalCurrentPoints.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* Level Progress */}
                                        {nextLevel ? (
                                            <div>
                                                <div className="flex justify-between text-[10px] text-white/30 uppercase tracking-widest mb-2">
                                                    <span>{memberLevel.label}</span>
                                                    <span>{nextLevel.label}</span>
                                                </div>
                                                <div className="w-full bg-white/10 rounded-full h-2.5">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 1, ease: 'easeOut' }}
                                                        className="h-2.5 rounded-full"
                                                        style={{ background: `linear-gradient(90deg, ${memberLevel.color}, ${nextLevel.color})` }}
                                                    />
                                                </div>
                                                <p className="text-white/40 text-xs mt-2">
                                                    {pointsToNext.toLocaleString()} poäng kvar till <span className="font-bold" style={{ color: nextLevel.color }}>{nextLevel.label}</span>
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                                <p className="text-white/60 text-sm">Du har nått den högsta nivån!</p>
                                            </div>
                                        )}

                                        {/* Member Perks */}
                                        <div className="mt-6 grid grid-cols-2 gap-2">
                                            {memberLevel.perks.map((perk, i) => (
                                                <div key={i} className="flex items-center gap-2 text-white/50 text-xs">
                                                    <Check size={12} style={{ color: memberLevel.color }} /> {perk}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* All Levels Overview */}
                                <div className="grid grid-cols-4 gap-3">
                                    {MEMBER_LEVELS.map((lvl) => {
                                        const isActive = memberLevel.key === lvl.key;
                                        const isAchieved = loyalty.totalPointsEarned >= lvl.threshold;
                                        return (
                                            <div
                                                key={lvl.key}
                                                className={clsx(
                                                    "rounded-2xl p-4 text-center border transition-all",
                                                    isActive
                                                        ? "bg-white dark:bg-[#1a1a1a] border-2 shadow-md"
                                                        : isAchieved
                                                            ? "bg-white dark:bg-[#141414] border-black/5 dark:border-white/10 opacity-70"
                                                            : "bg-white dark:bg-[#141414] border-black/5 dark:border-white/10 opacity-30"
                                                )}
                                                style={isActive ? { borderColor: memberLevel.color } : {}}
                                            >
                                                <div className="text-2xl mb-2 flex justify-center text-foreground/20">
                                                    <LevelIcon level={lvl.key} size={24} />
                                                </div>
                                                <p className="text-xs font-bold" style={isActive || isAchieved ? { color: lvl.color } : {}}>{lvl.label}</p>
                                                <p className="text-[10px] text-black/30 dark:text-white/30 mt-1">{lvl.threshold}p</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Upcoming Bookings */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                                        <Clock size={18} className="text-champagne-500" /> Kommande bokningar
                                    </h3>
                                    {upcomingBookings.length > 0 ? upcomingBookings.map(b => (
                                        <div key={b.id} className="bg-white dark:bg-[#141414] rounded-2xl p-5 border border-black/5 dark:border-white/10 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-champagne-500/10 rounded-xl flex items-center justify-center text-champagne-500">
                                                    <Calendar size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-black dark:text-white text-sm">{b.service}</h4>
                                                    <p className="text-black/40 dark:text-white/40 text-xs mt-0.5">{b.provider} · {b.date} kl {b.time}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-black dark:text-white text-sm">{b.price} kr</p>
                                                <span className="text-[10px] px-2 py-0.5 bg-champagne-500/10 text-champagne-600 rounded-full font-bold">Bokad</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="bg-white dark:bg-[#141414] rounded-2xl p-8 border border-dashed border-black/10 dark:border-white/10 text-center">
                                            <Calendar size={32} className="text-black/10 dark:text-white/10 mx-auto mb-3" />
                                            <p className="text-black/30 dark:text-white/30 text-sm">Inga kommande bokningar</p>
                                            <Link href="/explore" className="inline-flex items-center gap-1 text-champagne-600 text-sm font-bold mt-2 hover:underline">
                                                Boka nu <ArrowRight size={12} />
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Actions */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Link href="/explore" className="bg-white dark:bg-[#141414] rounded-2xl p-5 border border-black/5 dark:border-white/10 shadow-sm hover:shadow-md transition-all group">
                                        <Calendar size={24} className="text-champagne-500 mb-3" />
                                        <h4 className="font-bold text-black dark:text-white text-sm group-hover:text-champagne-600 transition-colors">Boka ny tid</h4>
                                        <p className="text-black/30 dark:text-white/30 text-xs mt-1">Hitta och boka behandlingar</p>
                                    </Link>
                                    <button onClick={() => setActiveTab('rewards')} className="bg-white dark:bg-[#141414] rounded-2xl p-5 border border-black/5 dark:border-white/10 shadow-sm hover:shadow-md transition-all group text-left">
                                        <Gift size={24} className="text-champagne-500 mb-3" />
                                        <h4 className="font-bold text-black dark:text-white text-sm group-hover:text-champagne-600 transition-colors">Mina rewards</h4>
                                        <p className="text-black/30 dark:text-white/30 text-xs mt-1">{providersWithPoints.length} utförare med poäng</p>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ─── BOOKINGS ─── */}
                        {activeTab === 'bookings' && (
                            <motion.div key="bookings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Kommande</h3>
                                    {upcomingBookings.map(b => (
                                        <div key={b.id} className="bg-white dark:bg-[#141414] rounded-2xl p-5 border border-black/5 dark:border-white/10 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-champagne-500/10 rounded-xl flex items-center justify-center text-champagne-500"><Calendar size={20} /></div>
                                                <div>
                                                    <h4 className="font-bold text-black dark:text-white text-sm">{b.service}</h4>
                                                    <div className="flex items-center gap-2 mt-1"><MapPin size={12} className="text-black/30 dark:text-white/30" /><span className="text-black/40 dark:text-white/40 text-xs">{b.provider}</span></div>
                                                    <div className="flex items-center gap-2 mt-0.5"><Clock size={12} className="text-black/30 dark:text-white/30" /><span className="text-black/40 dark:text-white/40 text-xs">{b.date} kl {b.time}</span></div>
                                                </div>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="font-bold text-black dark:text-white">{b.price} kr</p>
                                                <p className="text-[10px] text-champagne-500 font-bold">+{Math.floor(b.price / 10) * 5}p</p>
                                                <button
                                                    onClick={() => setCancellingBooking(b.id)}
                                                    className="text-[10px] text-red-400 hover:text-red-500 font-bold transition-colors"
                                                >
                                                    Avboka
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Tidigare</h3>
                                    {pastBookings.map(b => (
                                        <div key={b.id} className="bg-white dark:bg-[#141414] rounded-2xl p-5 border border-black/5 dark:border-white/10 shadow-sm flex items-center justify-between opacity-70">
                                            <div className="flex items-center gap-4">
                                                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", b.status === 'completed' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                                    {b.status === 'completed' ? <Check size={20} /> : <AlertCircle size={20} />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-black dark:text-white text-sm">{b.service}</h4>
                                                    <p className="text-black/40 dark:text-white/40 text-xs mt-0.5">{b.provider} · {b.date}</p>
                                                </div>
                                            </div>
                                            <div className="text-right space-y-2">
                                                <p className="font-bold text-black dark:text-white text-sm">{b.price} kr</p>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-bold", b.status === 'completed' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                                        {b.status === 'completed' ? 'Genomförd' : 'Avbokad'}
                                                    </span>
                                                    {b.status === 'completed' && (
                                                        <Link
                                                            href={`/explore?q=${encodeURIComponent(b.provider)}`}
                                                            className="text-[10px] font-black uppercase tracking-widest text-champagne-600 hover:text-champagne-700 transition-colors flex items-center gap-1"
                                                        >
                                                            Boka igen <ArrowRight size={10} />
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ─── REWARDS ─── */}
                        {activeTab === 'rewards' && (
                            <motion.div key="rewards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

                                {/* Points Balance */}
                                <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-2xl p-6 text-white border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-champagne-500/20 rounded-xl flex items-center justify-center">
                                            <Star size={24} className="text-champagne-400 fill-champagne-400" />
                                        </div>
                                        <div>
                                            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Tillgängliga poäng</p>
                                            <p className="text-3xl font-heading font-bold text-champagne-400">{totalCurrentPoints.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowHistory(!showHistory)}
                                        className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1 font-bold"
                                    >
                                        Historik <ChevronDown size={12} className={clsx("transition-transform", showHistory && "rotate-180")} />
                                    </button>
                                </div>

                                {/* Transaction History */}
                                <AnimatePresence>
                                    {showHistory && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
                                                <div className="px-5 py-3 border-b border-black/5 dark:border-white/10">
                                                    <h4 className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Poänghistorik</h4>
                                                </div>
                                                <div className="divide-y divide-black/5 dark:divide-white/5">
                                                    {allTransactions.map((tx: PointTransaction) => (
                                                        <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-xs",
                                                                    tx.type === 'earned' ? 'bg-green-500/10 text-green-500' :
                                                                        tx.type === 'spent' ? 'bg-champagne-500/10 text-champagne-500' :
                                                                            'bg-red-500/10 text-red-500'
                                                                )}>
                                                                    {tx.type === 'earned' ? '+' : tx.type === 'spent' ? '−' : '↩'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-black dark:text-white">{tx.description}</p>
                                                                    <p className="text-[10px] text-black/30 dark:text-white/30">{tx.providerName} · {tx.date}</p>
                                                                </div>
                                                            </div>
                                                            <span className={clsx("text-sm font-bold",
                                                                tx.type === 'earned' ? 'text-green-500' :
                                                                    tx.type === 'spent' ? 'text-champagne-500' :
                                                                        'text-red-500'
                                                            )}>
                                                                {tx.amount > 0 ? '+' : ''}{tx.amount}p
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Per-Provider Point Balances */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Poäng per utförare</h3>
                                    <p className="text-xs text-black/40 dark:text-white/40 -mt-2">Dina poäng kan enbart lösas in hos den utförare där de tjänats</p>
                                    {providersWithPoints.length > 0 ? providersWithPoints.map((balance: ProviderPointBalance) => {
                                        const providerRewards = getAvailableRewardsAtProvider(loyalty, balance.providerId);
                                        return (
                                            <div
                                                key={balance.providerId}
                                                className="bg-white dark:bg-[#141414] rounded-2xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden"
                                            >
                                                <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-champagne-500/10 flex items-center justify-center text-champagne-500">
                                                            <Star size={18} className="fill-champagne-400" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-black dark:text-white text-sm">{balance.providerName}</h4>
                                                            <p className="text-[10px] text-black/30 dark:text-white/30">{balance.currentPoints} poäng tillgängliga · {providerRewards.length} rewards</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-lg font-heading font-bold text-champagne-600">{balance.currentPoints}p</span>
                                                </div>
                                                {/* Reward options for this provider */}
                                                {REWARD_TIERS.map(tier => {
                                                    const canAfford = balance.currentPoints >= tier.pointsCost;
                                                    return (
                                                        <div key={tier.pointsCost} className={clsx("border-b border-black/5 dark:border-white/5 last:border-0", !canAfford && "opacity-40")}>
                                                            <div className="px-6 py-3 flex items-center justify-between">
                                                                <span className="text-xs font-bold text-black dark:text-white">{tier.label}</span>
                                                                {canAfford && (
                                                                    <span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full font-bold">Tillgänglig</span>
                                                                )}
                                                            </div>
                                                            <div className="px-4 pb-3 grid grid-cols-3 gap-2">
                                                                {tier.options.map(opt => (
                                                                    <button
                                                                        key={opt.id}
                                                                        disabled={!canAfford}
                                                                        onClick={() => {
                                                                            setSelectedReward({ tier, option: opt, providerId: balance.providerId, providerName: balance.providerName } as any);
                                                                            setShowRewardModal(true);
                                                                        }}
                                                                        className={clsx(
                                                                            "p-3 rounded-xl text-center transition-all border",
                                                                            canAfford
                                                                                ? "hover:border-champagne-500 hover:bg-champagne-500/5 border-transparent cursor-pointer"
                                                                                : "border-transparent cursor-not-allowed"
                                                                        )}
                                                                    >
                                                                        <div className="mb-2 flex justify-center text-champagne-500">
                                                                            <DynamicIcon name={opt.icon} size={24} />
                                                                        </div>
                                                                        <p className="text-[10px] font-bold text-black dark:text-white">{opt.label}</p>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }) : (
                                        <div className="bg-white dark:bg-[#141414] rounded-2xl p-8 border border-dashed border-black/10 dark:border-white/10 text-center">
                                            <Gift size={32} className="text-black/10 dark:text-white/10 mx-auto mb-3" />
                                            <p className="text-black/30 dark:text-white/30 text-sm">Du har inga poäng hos någon utförare ännu</p>
                                            <Link href="/explore" className="inline-flex items-center gap-1 text-champagne-600 text-sm font-bold mt-2 hover:underline">
                                                Boka en behandling <ArrowRight size={12} />
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Rules */}
                                <div className="bg-white dark:bg-[#141414] rounded-2xl p-6 border border-black/5 dark:border-white/10 shadow-sm">
                                    <h4 className="text-xs font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-4">Så fungerar poäng</h4>
                                    <div className="space-y-3 text-xs text-black/50 dark:text-white/50">
                                        <p><strong>10 kr = 5 poäng</strong> – tjänas automatiskt efter genomförd bokning</p>
                                        <p>✦ Poäng registreras när bokning är genomförd och betald</p>
                                        <p>✦ <strong>Poäng gäller enbart hos den utförare där de tjänats</strong></p>
                                        <p>✦ Ingen poäng vid avbokning, no-show eller refund</p>
                                        <p>✦ Poäng kan inte köpas, överföras eller delas</p>
                                        <p>✦ Redan intjänade poäng kan alltid användas hos rätt utförare</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ─── SETTINGS ─── */}
                        {activeTab === 'settings' && (
                            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                {/* Personal Info */}
                                <div className="bg-white dark:bg-[#141414] rounded-2xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-black/5 dark:border-white/10">
                                        <h3 className="font-bold text-black dark:text-white flex items-center gap-2"><User size={16} /> Personuppgifter</h3>
                                        <p className="text-black/30 dark:text-white/30 text-xs mt-1">Denna information syns inte för utförare</p>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Förnamn *</label>
                                                <input value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Efternamn *</label>
                                                <input value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} className={inputClass} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">E-post *</label>
                                            <div className="flex items-center gap-2">
                                                <Mail size={16} className="text-black/20 dark:text-white/20" />
                                                <input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className={inputClass} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Telefonnummer *</label>
                                            <div className="flex items-center gap-2">
                                                <Phone size={16} className="text-black/20 dark:text-white/20" />
                                                <input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
                                            </div>
                                        </div>
                                        <button onClick={() => saveProfile(profile)} className="w-full bg-black dark:bg-champagne-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-champagne-600 transition-all shadow-md">
                                            Spara ändringar
                                        </button>
                                    </div>
                                </div>

                                {/* Payment */}
                                <div className="bg-white dark:bg-[#141414] rounded-2xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-black/5 dark:border-white/10">
                                        <h3 className="font-bold text-black dark:text-white flex items-center gap-2"><CreditCard size={16} /> Betaluppgifter</h3>
                                        <p className="text-black/30 dark:text-white/30 text-xs mt-1">Smidiga och säkra betalningar</p>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {profile.bankDetails ? (
                                            <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] rounded-2xl p-6 text-white">
                                                <div className="flex justify-between items-start mb-8">
                                                    <Shield size={24} className="text-champagne-400" />
                                                    <span className="text-xs font-bold text-white/30 uppercase tracking-widest">{profile.bankDetails.cardBrand}</span>
                                                </div>
                                                <p className="text-lg font-mono tracking-[0.3em] mb-4">•••• •••• •••• {profile.bankDetails.cardLast4}</p>
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Kortinnehavare</p>
                                                        <p className="text-sm font-bold">{profile.firstName} {profile.lastName}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Giltig t.o.m</p>
                                                        <p className="text-sm font-bold">{profile.bankDetails.expiryDate}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl p-8 text-center">
                                                <CreditCard size={32} className="text-black/10 dark:text-white/10 mx-auto mb-3" />
                                                <p className="text-black/30 dark:text-white/30 text-sm">Inget kort tillagt än</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => profile.bankDetails ? handleRemoveCard() : setShowCardModal(true)}
                                            className="w-full bg-[#F5F3EE] dark:bg-white/5 text-black dark:text-white py-3 rounded-xl font-bold text-sm border border-black/10 dark:border-white/10 hover:border-champagne-500 transition-all"
                                        >
                                            {profile.bankDetails ? 'Ta bort kort' : 'Lägg till kort'}
                                        </button>
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="bg-white dark:bg-[#141414] rounded-2xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-black/5 dark:border-white/10">
                                        <h3 className="font-bold text-black dark:text-white flex items-center gap-2"><Lock size={16} /> Byt lösenord</h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Nuvarande lösenord</label>
                                            <div className="relative">
                                                <input type={showPassword ? 'text' : 'password'} value={passwordData.current} onChange={e => setPasswordData(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" className={inputClass} />
                                                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white transition-colors">
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Nytt lösenord</label>
                                            <input type="password" value={passwordData.newPass} onChange={e => setPasswordData(p => ({ ...p, newPass: e.target.value }))} placeholder="Minst 6 tecken" className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Bekräfta nytt lösenord</label>
                                            <input type="password" value={passwordData.confirm} onChange={e => setPasswordData(p => ({ ...p, confirm: e.target.value }))} placeholder="Upprepa lösenordet" className={inputClass} />
                                        </div>
                                        <button onClick={handlePasswordChange} className="w-full bg-black dark:bg-champagne-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-champagne-600 transition-all shadow-md">
                                            Uppdatera lösenord
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 py-3 text-red-400 hover:text-red-500 text-sm font-bold transition-colors"
                                >
                                    <LogOut size={16} /> Logga ut
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* ═══ Reward Redemption Modal ═══ */}
            <AnimatePresence>
                {showRewardModal && selectedReward && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        onClick={() => setShowRewardModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-black/10 dark:border-white/10"
                        >
                            <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] p-8 text-center">
                                <div className="mb-4 flex justify-center text-champagne-400">
                                    <DynamicIcon name={selectedReward.option.icon} size={48} />
                                </div>
                                <h3 className="text-lg font-heading font-bold text-white">{selectedReward.option.label}</h3>
                                <p className="text-white/40 text-sm mt-1">{selectedReward.option.description}</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between p-4 bg-champagne-500/5 rounded-xl border border-champagne-500/10">
                                    <span className="text-sm text-black dark:text-white">Kostnad</span>
                                    <span className="font-bold text-champagne-600">{selectedReward.tier.pointsCost} poäng</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-xl">
                                    <span className="text-sm text-black dark:text-white">Ditt saldo efter</span>
                                    <span className="font-bold text-black dark:text-white">{totalCurrentPoints - selectedReward.tier.pointsCost} poäng</span>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowRewardModal(false)}
                                        className="flex-1 py-3 rounded-xl border border-black/10 dark:border-white/10 text-sm font-bold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                    >
                                        Avbryt
                                    </button>
                                    <button
                                        onClick={() => handleRedeemReward(selectedReward.tier, selectedReward.option, (selectedReward as any).providerId)}
                                        className="flex-1 py-3 rounded-xl bg-black dark:bg-champagne-600 text-white text-sm font-bold hover:bg-champagne-600 transition-all shadow-md"
                                    >
                                        Lös in
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Add Card Modal ═══ */}
            <AnimatePresence>
                {showCardModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        onClick={() => setShowCardModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-black/10 dark:border-white/10"
                        >
                            <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] p-6 text-center">
                                <CreditCard size={32} className="text-champagne-400 mx-auto mb-2" />
                                <h3 className="text-lg font-heading font-bold text-white">Lägg till betalkort</h3>
                                <p className="text-white/40 text-xs mt-1">Dina uppgifter lagras säkert och krypterat</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Kortnummer</label>
                                    <input
                                        type="text"
                                        value={cardForm.number}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                                            const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
                                            setCardForm(f => ({ ...f, number: formatted }));
                                        }}
                                        placeholder="0000 0000 0000 0000"
                                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-champagne-500 outline-none transition-all text-sm font-mono tracking-widest text-foreground placeholder:text-foreground/20"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Giltig t.o.m</label>
                                        <input
                                            type="text"
                                            value={cardForm.expiry}
                                            onChange={e => {
                                                let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                                                setCardForm(f => ({ ...f, expiry: val }));
                                            }}
                                            placeholder="MM/ÅÅ"
                                            className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-champagne-500 outline-none transition-all text-sm font-mono text-foreground placeholder:text-foreground/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">CVC</label>
                                        <input
                                            type="text"
                                            value={cardForm.cvc}
                                            onChange={e => setCardForm(f => ({ ...f, cvc: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                                            placeholder="000"
                                            className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-champagne-500 outline-none transition-all text-sm font-mono text-foreground placeholder:text-foreground/20"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1.5 block">Kortinnehavare</label>
                                    <input
                                        type="text"
                                        value={cardForm.name}
                                        onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Namn på kortet"
                                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-champagne-500 outline-none transition-all text-sm font-medium text-foreground placeholder:text-foreground/20"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowCardModal(false)}
                                        className="flex-1 py-3 rounded-xl border border-black/10 dark:border-white/10 text-sm font-bold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                    >
                                        Avbryt
                                    </button>
                                    <button
                                        onClick={handleAddCard}
                                        className="flex-1 py-3 rounded-xl bg-black dark:bg-champagne-600 text-white text-sm font-bold hover:bg-champagne-600 transition-all shadow-md"
                                    >
                                        Spara kort
                                    </button>
                                </div>
                                <p className="text-[10px] text-black/20 dark:text-white/20 text-center flex items-center justify-center gap-1">
                                    <Shield size={10} /> SSL-krypterad anslutning
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Cancel Booking Confirmation ═══ */}
            <AnimatePresence>
                {cancellingBooking && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        onClick={() => setCancellingBooking(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-black/10 dark:border-white/10"
                        >
                            <div className="p-8 text-center space-y-4">
                                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full mx-auto flex items-center justify-center">
                                    <AlertCircle size={32} />
                                </div>
                                <h3 className="text-lg font-heading font-bold text-black dark:text-white">Avboka behandling?</h3>
                                <p className="text-black/40 dark:text-white/40 text-sm">
                                    Är du säker på att du vill avboka denna tid? Du kan alltid boka en ny tid efteråt.
                                </p>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setCancellingBooking(null)}
                                        className="flex-1 py-3 rounded-xl border border-black/10 dark:border-white/10 text-sm font-bold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                    >
                                        Behåll
                                    </button>
                                    <button
                                        onClick={() => handleCancelBooking(cancellingBooking)}
                                        className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all shadow-md"
                                    >
                                        Avboka
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
