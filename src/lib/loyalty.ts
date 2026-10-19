// ═══════════════════════════════════════════════════════════════
// GLOWBOOK LOYALTY & MEMBER LEVEL SYSTEM
// Premium · Fair · Anti-Manipulation
// ═══════════════════════════════════════════════════════════════

// ─── POINTS EARNING ───
// 10 kr spent = 5 points (after completed & paid booking)
export const POINTS_PER_10KR = 5;

export function calculatePoints(amountKr: number): number {
    return Math.floor(amountKr / 10) * POINTS_PER_10KR;
}

// ─── MEMBER LEVELS ───
export type MemberLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface MemberLevelInfo {
    key: MemberLevel;
    label: string;
    threshold: number;
    color: string;
    gradient: string;
    badgeEmoji: string;
    perks: string[];
}

export const MEMBER_LEVELS: MemberLevelInfo[] = [
    {
        key: 'bronze',
        label: 'Bronze',
        threshold: 0,
        color: '#CD7F32',
        gradient: 'from-[#CD7F32] to-[#A0522D]',
        badgeEmoji: '',
        perks: ['Grundmedlemskap', 'Tjäna lojalitetspoäng', 'Poänghistorik i profil'],
    },
    {
        key: 'silver',
        label: 'Silver',
        threshold: 500,
        color: '#C0C0C0',
        gradient: 'from-[#C0C0C0] to-[#808080]',
        badgeEmoji: '',
        perks: ['Silver badge i profil', 'Status visas för salongen', 'Lös in poäng mot rabatt'],
    },
    {
        key: 'gold',
        label: 'Gold',
        threshold: 1500,
        color: '#D4AF37',
        gradient: 'from-[#D4AF37] to-[#B8860B]',
        badgeEmoji: '',
        perks: ['Gold badge i profil', 'Fler rabattalternativ', 'Premiumstatus i portalen'],
    },
    {
        key: 'diamond',
        label: 'Diamond',
        threshold: 4000,
        color: '#B9F2FF',
        gradient: 'from-[#B9F2FF] to-[#7DF9FF]',
        badgeEmoji: '',
        perks: ['Diamond badge i profil', 'VIP-lojalitetsstatus', 'Maximala rabattförmåner'],
    },
];

export function getMemberLevel(totalPoints: number): MemberLevelInfo {
    let level = MEMBER_LEVELS[0];
    for (const l of MEMBER_LEVELS) {
        if (totalPoints >= l.threshold) level = l;
    }
    return level;
}

export function getNextLevel(totalPoints: number): MemberLevelInfo | null {
    const current = getMemberLevel(totalPoints);
    const idx = MEMBER_LEVELS.findIndex(l => l.key === current.key);
    return idx < MEMBER_LEVELS.length - 1 ? MEMBER_LEVELS[idx + 1] : null;
}

export function getLevelProgress(totalPoints: number): number {
    const current = getMemberLevel(totalPoints);
    const next = getNextLevel(totalPoints);
    if (!next) return 100;
    const range = next.threshold - current.threshold;
    const progress = totalPoints - current.threshold;
    return Math.min(Math.round((progress / range) * 100), 100);
}

export function getPointsToNextLevel(totalPoints: number): number {
    const next = getNextLevel(totalPoints);
    if (!next) return 0;
    return next.threshold - totalPoints;
}

// ─── REWARD TIERS (Simplified Points -> SEK Rabatt) ───
export interface RewardOption {
    id: string;
    label: string;
    description: string;
    icon: string; // emoji or lucide icon name
}

export interface RewardTier {
    pointsCost: number;     // e.g. 200
    discountAmount: number; // e.g. 50 (SEK)
    label: string;          // e.g. "50 kr rabatt"
    description?: string;
    options: RewardOption[];
}

export const DEFAULT_REWARD_TIERS: RewardTier[] = [
    {
        pointsCost: 200,
        discountAmount: 50,
        label: '50 kr rabatt',
        description: 'Dras av direkt vid betalning',
        options: [{ id: 'r_200_50', label: '50 kr rabatt', description: 'Dras av direkt vid betalning', icon: 'Banknote' }]
    },
    {
        pointsCost: 400,
        discountAmount: 100,
        label: '100 kr rabatt',
        description: 'Dras av direkt vid betalning',
        options: [{ id: 'r_400_100', label: '100 kr rabatt', description: 'Dras av direkt vid betalning', icon: 'Banknote' }]
    },
    {
        pointsCost: 600,
        discountAmount: 150,
        label: '150 kr rabatt',
        description: 'Dras av direkt vid betalning',
        options: [{ id: 'r_600_150', label: '150 kr rabatt', description: 'Dras av direkt vid betalning', icon: 'Banknote' }]
    },
    {
        pointsCost: 800,
        discountAmount: 200,
        label: '200 kr rabatt',
        description: 'Dras av direkt vid betalning',
        options: [{ id: 'r_800_200', label: '200 kr rabatt', description: 'Dras av direkt vid betalning', icon: 'Banknote' }]
    },
];

export const REWARD_TIERS: RewardTier[] = DEFAULT_REWARD_TIERS;

export function normalizeRewardTiers(rawTiers: any): RewardTier[] {
    if (!rawTiers || !Array.isArray(rawTiers) || rawTiers.length === 0) {
        return DEFAULT_REWARD_TIERS;
    }

    return rawTiers.map((tier: any, idx: number) => {
        const pointsCost = Number(tier.pointsCost) || (200 * (idx + 1));
        let discount = Number(tier.discountAmount) || 0;
        let label = tier.label || '';
        let description = tier.description || '';

        if (!discount && tier.options && Array.isArray(tier.options)) {
            for (const opt of tier.options) {
                const match = (opt.label || '').match(/(\d+)\s*kr/i);
                if (match) {
                    discount = parseInt(match[1], 10);
                    break;
                }
            }
        }
        if (!discount) {
            discount = Math.round(pointsCost / 4);
        }
        if (!label) {
            label = `${discount} kr rabatt`;
        }
        if (!description) {
            description = `Dra av ${discount} kr på din bokning`;
        }

        const options = (tier.options && Array.isArray(tier.options) && tier.options.length > 0)
            ? tier.options
            : [
                { id: `r_${pointsCost}_${discount}`, label: `${discount} kr rabatt`, description: 'Dras av direkt vid betalning', icon: 'Banknote' }
            ];

        return {
            pointsCost,
            discountAmount: discount,
            label,
            description,
            options
        };
    });
}

export function getAvailableRewards(currentPoints: number): RewardTier[] {
    return REWARD_TIERS.filter(t => currentPoints >= t.pointsCost);
}

// ─── PROVIDER COOLDOWN SYSTEM ───
export const LOYALTY_COOLDOWN_DAYS = 30;
export const LOYALTY_MIN_ACTIVE_DAYS = 30;

export type LoyaltyStatus = 'off' | 'active' | 'deactivating' | 'cooldown';

export interface ProviderLoyaltyState {
    enabled: boolean;
    status: LoyaltyStatus;
    activatedAt: string | null;      // ISO date
    deactivationRequestedAt: string | null; // ISO date
    deactivatedAt: string | null;    // ISO date
    cooldownEndsAt: string | null;   // ISO date
}

export function getDefaultLoyaltyState(): ProviderLoyaltyState {
    return {
        enabled: false,
        status: 'off',
        activatedAt: null,
        deactivationRequestedAt: null,
        deactivatedAt: null,
        cooldownEndsAt: null,
    };
}

export function calculateLoyaltyStatus(state: ProviderLoyaltyState, now: Date): {
    status: LoyaltyStatus;
    canActivate: boolean;
    canDeactivate: boolean;
    daysUntilAction: number;
    message: string;
} {
    if (!state.enabled && !state.deactivationRequestedAt) {
        // Check if in cooldown after deactivation
        if (state.cooldownEndsAt) {
            const cooldownEnd = new Date(state.cooldownEndsAt);
            if (now < cooldownEnd) {
                const daysLeft = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return {
                    status: 'cooldown',
                    canActivate: false,
                    canDeactivate: false,
                    daysUntilAction: daysLeft,
                    message: `Cooldown: ${daysLeft} dagar kvar innan du kan aktivera igen`,
                };
            }
        }
        return {
            status: 'off',
            canActivate: true,
            canDeactivate: false,
            daysUntilAction: 0,
            message: 'Poängsystem är inaktivt',
        };
    }

    if (state.enabled && state.deactivationRequestedAt) {
        const deactivateDate = new Date(state.deactivationRequestedAt);
        deactivateDate.setDate(deactivateDate.getDate() + LOYALTY_COOLDOWN_DAYS);
        if (now < deactivateDate) {
            const daysLeft = Math.ceil((deactivateDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return {
                status: 'deactivating',
                canActivate: false,
                canDeactivate: false,
                daysUntilAction: daysLeft,
                message: `Avstängning om ${daysLeft} dagar. Kunder tjänar fortfarande poäng.`,
            };
        }
    }

    if (state.enabled && state.activatedAt) {
        const activatedDate = new Date(state.activatedAt);
        activatedDate.setDate(activatedDate.getDate() + LOYALTY_MIN_ACTIVE_DAYS);
        const canDeactivate = now >= activatedDate;
        const daysLeft = canDeactivate ? 0 : Math.ceil((activatedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            status: 'active',
            canActivate: false,
            canDeactivate,
            daysUntilAction: daysLeft,
            message: canDeactivate
                ? 'Poängsystem är aktivt. Du kan stänga av med 30 dagars uppsägning.'
                : `Poängsystem måste vara aktivt i minst 30 dagar. ${daysLeft} dagar kvar.`,
        };
    }

    return {
        status: 'off',
        canActivate: true,
        canDeactivate: false,
        daysUntilAction: 0,
        message: 'Poängsystem är inaktivt',
    };
}

// ─── POINT RULES (anti-manipulation) ───
// Points can NEVER be: purchased, transferred, shared, manually given
// Points can NEVER be: deleted or reset by provider
// Already earned points can ALWAYS be used at the provider where earned
// Provider can change future earning rules, but not past points
// Points only earned on: completed + paid bookings
// No points on: cancellation, no-show, refund
// On refund: points are automatically removed
// Points expire 24 months from the date they were earned
// IMPORTANT: Points are PER PROVIDER – earned at Provider X, only redeemable at Provider X
// Points do NOT apply globally across all providers

export const POINTS_EXPIRATION_MONTHS = 24;

export function isTransactionExpired(date: string | Date, now = new Date()): boolean {
    const txDate = new Date(date);
    const expirationDate = new Date(txDate);
    expirationDate.setMonth(expirationDate.getMonth() + POINTS_EXPIRATION_MONTHS);
    return now.getTime() > expirationDate.getTime();
}

export interface PointTransaction {
    id: string;
    type: 'earned' | 'spent' | 'refunded';
    amount: number;
    description: string;
    date: string;
    providerId: string;       // Points are always tied to a specific provider
    providerName?: string;    // Display name for UI
    bookingId?: string;
    rewardId?: string;
}

// Points per provider – each provider has their own balance
export interface ProviderPointBalance {
    providerId: string;
    providerName: string;
    totalPointsEarned: number;
    currentPoints: number;
    transactions: PointTransaction[];
    redeemedRewards: string[];
}

export interface CustomerLoyaltyData {
    // Global stats (for member level calculation)
    totalPointsEarned: number;       // Sum across ALL providers (determines member level)
    memberLevel: MemberLevel;
    // Per-provider balances (for spending)
    providerBalances: ProviderPointBalance[];
}

export function getDefaultCustomerLoyalty(): CustomerLoyaltyData {
    return {
        totalPointsEarned: 0,
        memberLevel: 'bronze',
        providerBalances: [],
    };
}

// Get points available to spend at a specific provider
export function getProviderPoints(loyalty: CustomerLoyaltyData, providerId: string): number {
    const balance = loyalty.providerBalances.find(b => b.providerId === providerId);
    return balance?.currentPoints ?? 0;
}

// Get all providers where customer has points  
export function getProvidersWithPoints(loyalty: CustomerLoyaltyData): ProviderPointBalance[] {
    return loyalty.providerBalances.filter(b => b.currentPoints > 0);
}

// Get available rewards at a specific provider
export function getAvailableRewardsAtProvider(
    loyalty: CustomerLoyaltyData, 
    providerId: string, 
    customRewards?: RewardTier[] | null
): RewardTier[] {
    const points = getProviderPoints(loyalty, providerId);
    const tiers = (customRewards && Array.isArray(customRewards) && customRewards.length > 0) ? customRewards : REWARD_TIERS;
    return tiers.filter(t => points >= t.pointsCost);
}
