export type MembershipTierKey = 'bas' | 'pro' | 'luxe';

export const TIER_PRICES: Record<MembershipTierKey, number> = {
    bas: 99,
    pro: 179,
    luxe: 379,
};

export const DURATION_DISCOUNTS: Record<number, number> = {
    1: 0,
    3: 0.05,
    6: 0.10,
    12: 0.15,
};

export const STRIPE_TIER_PRICE_IDS: Record<MembershipTierKey, Record<number, string>> = {
    bas: {
        1: 'price_1Uez9VDEreE5JKEk40Tp7O9I',
        3: 'price_1UfRhzDEreE5JKEkV87K7eX3',
        6: 'price_1UfRj9DEreE5JKEkpGGLg29i',
        12: 'price_1UfRk9DEreE5JKEkhAhVrcff',
    },
    pro: {
        1: 'price_1UezAPDEreE5JKEkNc5oPfXy',
        3: 'price_1UfRkrDEreE5JKEkDCweuSaN',
        6: 'price_1UfRllDEreE5JKEkS7nIZ7Nm',
        12: 'price_1UfRmSDEreE5JKEkdsSdXVak',
    },
    luxe: {
        1: 'price_1UezCiDEreE5JKEkpWqL24c2',
        3: 'price_1UfRnBDEreE5JKEkQsWSJfM3',
        6: 'price_1UfRoKDEreE5JKEk6307xKmC',
        12: 'price_1Tf1xnDEreE5JKEk4ahIvGv7',
    },
};

export const MEMBERSHIP_DURATIONS: ReadonlyArray<{
    value: number;
    label: string;
    discount: number;
    badge?: string;
}> = [
    { value: 1, label: '1 Månad', discount: 0 },
    { value: 3, label: '3 Månader', discount: 0.05, badge: '5% OFF' },
    { value: 6, label: '6 Månader', discount: 0.10, badge: '10% OFF' },
    { value: 12, label: '12 Månader', discount: 0.15, badge: '15% OFF' },
];

export const TRIAL_PERIOD_DAYS = 90;

export function normalizeTierKey(tier?: string | null): MembershipTierKey {
    const t = (tier || 'pro').toLowerCase().trim();
    if (t === 'bas' || t === 'start') return 'bas';
    if (t === 'luxe' || t === 'studio' || t === 'diamond') return 'luxe';
    return 'pro';
}

export function normalizeDuration(duration?: number | string | null): number {
    const n = Number(duration) || 1;
    if (n === 3 || n === 6 || n === 12) return n;
    return 1;
}

/**
 * Calculates monthly and total SEK membership pricing for a given tier and binding duration.
 */
export function calculateMembershipPrice(tier?: string | null, duration?: number | string | null) {
    const tierKey = normalizeTierKey(tier);
    const dur = normalizeDuration(duration);
    const baseMonthly = TIER_PRICES[tierKey];
    const discount = DURATION_DISCOUNTS[dur] || 0;
    const monthly = Math.round(baseMonthly * (1 - discount));
    const total = monthly * dur;
    return {
        tierKey,
        duration: dur,
        baseMonthly,
        monthly,
        total,
        discountPercent: Math.round(discount * 100),
    };
}

/**
 * Resolves an optional Stripe Price ID from env vars only when it matches the selected duration,
 * falling back to verified official Stripe price IDs.
 */
export function getConfiguredStripePriceId(tier: string, duration: number): string {
    const tierKey = normalizeTierKey(tier);
    const tierUpper = tierKey.toUpperCase();
    const dur = normalizeDuration(duration);

    const exactDurationPrice = process.env[`STRIPE_PRICE_${tierUpper}_${dur}`];
    if (exactDurationPrice) return exactDurationPrice;

    if (dur === 1) {
        const basePrice = process.env[`STRIPE_PRICE_${tierUpper}`];
        if (basePrice) return basePrice;

        const legacyPrice = process.env[`STRIPE_PRICE_ID_${tierUpper}`];
        if (legacyPrice) return legacyPrice;
    }

    return STRIPE_TIER_PRICE_IDS[tierKey]?.[dur] || '';
}
