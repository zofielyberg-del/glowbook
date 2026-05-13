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
        perks: ['Grundmedlemskap', 'Poängintjäning vid bokning'],
    },
    {
        key: 'silver',
        label: 'Silver',
        threshold: 500,
        color: '#C0C0C0',
        gradient: 'from-[#C0C0C0] to-[#808080]',
        badgeEmoji: '',
        perks: ['Silver badge', 'Tidigare bokningstillgång ibland', 'Statusvisning i profil'],
    },
    {
        key: 'gold',
        label: 'Gold',
        threshold: 1500,
        color: '#D4AF37',
        gradient: 'from-[#D4AF37] to-[#B8860B]',
        badgeEmoji: '',
        perks: ['Gold badge', 'Prioriterad bokningsvisning', 'Exklusiva kampanjer', 'Premiumstatus'],
    },
    {
        key: 'diamond',
        label: 'Diamond',
        threshold: 4000,
        color: '#B9F2FF',
        gradient: 'from-[#B9F2FF] to-[#7DF9FF]',
        badgeEmoji: '',
        perks: ['Diamond badge', 'VIP-status', 'Tidiga släpp av tider', 'Exklusiv portalupplevelse'],
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

// ─── REWARD TIERS ───
export interface RewardOption {
    id: string;
    label: string;
    description: string;
    icon: string; // emoji
}

export interface RewardTier {
    pointsCost: number;
    label: string;
    options: RewardOption[];
}

export const REWARD_TIERS: RewardTier[] = [
    {
        pointsCost: 150,
        label: '150 poäng',
        options: [
            { id: 'r150_1', label: '20% på tillägg', description: 'Rabatt på valfritt tillägg', icon: 'Scissors' },
            { id: 'r150_2', label: 'Gratis removal', description: 'Kostnadsfri borttagning', icon: 'Eraser' },
            { id: 'r150_3', label: '50 kr rabatt', description: 'Rabatt på nästa behandling', icon: 'Banknote' },
        ],
    },
    {
        pointsCost: 400,
        label: '400 poäng',
        options: [
            { id: 'r400_1', label: '20% på behandling', description: 'Rabatt på valfri behandling', icon: 'Sparkles' },
            { id: 'r400_2', label: '100 kr rabatt', description: 'Rabatt på nästa behandling', icon: 'Banknote' },
            { id: 'r400_3', label: 'Gratis tillägg', description: 'Valfritt tillägg helt gratis', icon: 'Gift' },
        ],
    },
    {
        pointsCost: 800,
        label: '800 poäng',
        options: [
            { id: 'r800_1', label: '30% på behandling', description: 'Stor rabatt på valfri behandling', icon: 'Star' },
            { id: 'r800_2', label: 'Gratis design/tillägg', description: 'Exklusiv design eller tillägg', icon: 'Palette' },
            { id: 'r800_3', label: 'Prioriterad bokning', description: 'Boka innan andra kunder', icon: 'Crown' },
        ],
    },
    {
        pointsCost: 1500,
        label: '1 500 poäng',
        options: [
            { id: 'r1500_1', label: '50% på behandling', description: 'Halva priset – 1 gång', icon: 'Flame' },
            { id: 'r1500_2', label: 'Gratis premiumtillägg', description: 'Det bästa vi erbjuder – gratis', icon: 'Gem' },
            { id: 'r1500_3', label: 'VIP-status hos utförare', description: 'Exklusiv VIP-status', icon: 'Award' },
        ],
    },
];

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
// IMPORTANT: Points are PER PROVIDER – earned at Provider X, only redeemable at Provider X
// Points do NOT apply globally across all providers

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
export function getAvailableRewardsAtProvider(loyalty: CustomerLoyaltyData, providerId: string): RewardTier[] {
    const points = getProviderPoints(loyalty, providerId);
    return REWARD_TIERS.filter(t => points >= t.pointsCost);
}
