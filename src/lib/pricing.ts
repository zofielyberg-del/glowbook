export type MembershipTierKey = 'bas' | 'pro' | 'luxe';

export const TIER_PRICES: Record<MembershipTierKey, number> = {
    bas: 79,
    pro: 149,
    luxe: 349,
};

export const DURATION_DISCOUNTS: Record<number, number> = {
    1: 0,
    3: 0.05,
    6: 0.10,
    12: 0.15,
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
 * Resolves an optional Stripe Price ID from env vars only when it matches the selected duration
 * (falls back to base tier price IDs only for 1-month billing so multi-month bundles keep exact intervals).
 */
export function getConfiguredStripePriceId(tier: string, duration: number): string {
    const tierUpper = normalizeTierKey(tier).toUpperCase();
    const dur = normalizeDuration(duration);

    const exactDurationPrice = process.env[`STRIPE_PRICE_${tierUpper}_${dur}`];
    if (exactDurationPrice) return exactDurationPrice;

    if (dur === 1) {
        const basePrice = process.env[`STRIPE_PRICE_${tierUpper}`];
        if (basePrice) return basePrice;

        const legacyPrice = process.env[`STRIPE_PRICE_ID_${tierUpper}`];
        if (legacyPrice) return legacyPrice;
    }

    return '';
}
