
import { prisma } from './prisma';

/**
 * Checks if a salon has an active or trialing subscription.
 * If not, they should be blocked from accessing dashboard features.
 */
export async function checkSalonAccess(salonId: string): Promise<{ hasAccess: boolean; status: string }> {
    const salon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: { subscription_status: true, membership_tier: true }
    });

    if (!salon || !salon.subscription_status) {
        return { hasAccess: false, status: 'not_found' };
    }

    const validStatuses = ['active', 'trialing'];
    const hasAccess = validStatuses.includes(salon.subscription_status);

    return {
        hasAccess,
        status: salon.subscription_status
    };
}
