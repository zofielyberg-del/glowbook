import { prisma } from '@/lib/prisma';

export type RewardTierName = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';

export interface UserRewardsSummaryResponse {
  isRewardsActive: boolean;
  message?: string;
  totalPoints?: number;
  currentTier?: RewardTierName;
  badgeKey?: string;
  canRedeem?: boolean;
  redemption?: {
    availableDiscountKr: number;
    pointsRequired: number;
    checkoutMessage: string;
  };
  nextTier?: {
    tier: RewardTierName;
    pointsRemaining: number;
  } | null;
}

/**
 * Calculates member tier, badge, redemption status, and discount options
 * based on user points for a specific salon (including global points).
 */
export async function getUserRewardsSummary(
  userId: string,
  salonId: string
): Promise<UserRewardsSummaryResponse> {
  // 1. Verify if salon exists and has rewards enabled
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      id: true,
      name: true,
      is_rewards_enabled: true,
    },
  });

  if (!salon || !salon.is_rewards_enabled) {
    return {
      isRewardsActive: false,
      message: 'Denna salong har inte aktiverat lojalitetspoäng.',
    };
  }

  // 2. Aggregate points from user_rewards_ledger:
  // Points tied to this specific salon OR global points (salon_id is null)
  const ledgerEntries = await prisma.userRewardsLedger.findMany({
    where: {
      user_id: userId,
      OR: [
        { salon_id: salonId },
        { salon_id: null },
      ],
    },
    select: {
      points: true,
    },
  });

  const totalPoints = ledgerEntries.reduce((acc, entry) => acc + entry.points, 0);

  // 3. Tier Calculation & Thresholds:
  // Bronze: 0 - 499
  // Silver: 500 - 1499
  // Gold: 1500 - 3999
  // Diamond: 4000+
  let currentTier: RewardTierName = 'BRONZE';
  let badgeKey = 'bronze-badge';
  let canRedeem = false;
  let availableDiscountKr = 0;
  let pointsRequired = 0;
  let checkoutMessage = '';
  let nextTier: { tier: RewardTierName; pointsRemaining: number } | null = null;

  if (totalPoints >= 4000) {
    currentTier = 'DIAMOND';
    badgeKey = 'diamond-badge';
    canRedeem = true;
    availableDiscountKr = 500; // Represents high tier / max discount up to 50%
    pointsRequired = 4000;
    checkoutMessage = 'VIP Diamond-status: Du kan använda dina poäng för maximal rabatt på denna behandling!';
    nextTier = null;
  } else if (totalPoints >= 1500) {
    currentTier = 'GOLD';
    badgeKey = 'gold-badge';
    canRedeem = true;
    availableDiscountKr = 250;
    pointsRequired = 1500;
    checkoutMessage = `Du har ${totalPoints.toLocaleString('sv-SE')} poäng! Använd 1 500 poäng för att få upp till 250 kr rabatt.`;
    nextTier = {
      tier: 'DIAMOND',
      pointsRemaining: 4000 - totalPoints,
    };
  } else if (totalPoints >= 500) {
    currentTier = 'SILVER';
    badgeKey = 'silver-badge';
    canRedeem = true;
    availableDiscountKr = 100;
    pointsRequired = 1000; // In Silver, customers can redeem 100 kr with 1000p (or their tier threshold)
    checkoutMessage = `Du har ${totalPoints.toLocaleString('sv-SE')} poäng! Använd ${pointsRequired.toLocaleString('sv-SE')} poäng för att få 100 kr rabatt på denna bokning.`;
    nextTier = {
      tier: 'GOLD',
      pointsRemaining: 1500 - totalPoints,
    };
  } else {
    currentTier = 'BRONZE';
    badgeKey = 'bronze-badge';
    canRedeem = false;
    availableDiscountKr = 0;
    pointsRequired = 500;
    checkoutMessage = 'Du är Bronze-medlem. Du behöver 500 poäng för att börja låsa upp rabatter.';
    nextTier = {
      tier: 'SILVER',
      pointsRemaining: 500 - totalPoints,
    };
  }

  return {
    isRewardsActive: true,
    totalPoints,
    currentTier,
    badgeKey,
    canRedeem,
    redemption: {
      availableDiscountKr,
      pointsRequired,
      checkoutMessage,
    },
    nextTier,
  };
}

/**
 * Event Trigger: Account Created
 * Awards +100 global welcome points (salon_id: null)
 */
export async function triggerAccountCreatedReward(userId: string) {
  try {
    // Check if welcome reward was already recorded to prevent duplicate bonuses
    const existing = await prisma.userRewardsLedger.findFirst({
      where: {
        user_id: userId,
        action_type: 'ACCOUNT_CREATED',
      },
    });

    if (existing) {
      return existing;
    }

    return await prisma.userRewardsLedger.create({
      data: {
        user_id: userId,
        salon_id: null,
        points: 100,
        action_type: 'ACCOUNT_CREATED',
      },
    });
  } catch (error) {
    console.error('[Rewards] Failed to trigger account created reward:', error);
    return null;
  }
}

/**
 * Event Trigger: Booking Completed
 * Awards points if salon has is_rewards_enabled = true
 */
export async function triggerBookingCompletedReward({
  appointmentId,
  userId,
  salonId,
  totalPrice,
}: {
  appointmentId: string;
  userId?: string | null;
  salonId?: string | null;
  totalPrice?: number | null;
}) {
  try {
    if (!salonId) {
      return null;
    }

    // 1. Check if salon has is_rewards_enabled == true
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, is_rewards_enabled: true },
    });

    if (!salon || !salon.is_rewards_enabled) {
      console.log(`[Rewards] Salon ${salonId} has rewards disabled. Skipping point generation.`);
      return null;
    }

    // 2. Identify the customer profile ID
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { customer_id: true, customer_email: true, total_price: true },
      });

      if (appointment?.customer_id) {
        resolvedUserId = appointment.customer_id;
      } else if (appointment?.customer_email) {
        const profile = await prisma.profile.findUnique({
          where: { email: appointment.customer_email },
          select: { id: true },
        });
        resolvedUserId = profile?.id;
      }

      if (!totalPrice && appointment?.total_price) {
        totalPrice = Number(appointment.total_price);
      }
    }

    if (!resolvedUserId) {
      console.log(`[Rewards] No registered user account found for booking ${appointmentId}.`);
      return null;
    }

    // Check if points already recorded for this booking
    const existingEntry = await prisma.userRewardsLedger.findFirst({
      where: {
        action_type: 'BOOKING_COMPLETED',
        reference_id: appointmentId,
      },
    });

    if (existingEntry) {
      console.log(`[Rewards] Points already awarded for booking ${appointmentId}.`);
      return existingEntry;
    }

    // Calculate points: 100 points minimum, or 10% of booking price (1 SEK = 1 pt)
    const pointsToAward = totalPrice && totalPrice > 0 ? Math.max(100, Math.floor(totalPrice)) : 100;

    const ledgerEntry = await prisma.userRewardsLedger.create({
      data: {
        user_id: resolvedUserId,
        salon_id: salonId,
        points: pointsToAward,
        action_type: 'BOOKING_COMPLETED',
        reference_id: appointmentId,
      },
    });

    // Also update total_points_earned on profile for convenience
    await prisma.profile.update({
      where: { id: resolvedUserId },
      data: {
        total_points_earned: { increment: pointsToAward },
      },
    }).catch(err => console.error('[Rewards] Failed to increment profile points:', err));

    return ledgerEntry;
  } catch (error) {
    console.error('[Rewards] Failed to award booking completed points:', error);
    return null;
  }
}
