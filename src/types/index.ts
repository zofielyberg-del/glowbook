
export type Role = 'admin' | 'salon_owner' | 'practitioner' | 'customer' | 'guest';

export interface UserProfile {
    id: string;
    email: string;
    role: Role;
    fullName?: string;
    avatarUrl?: string;
    createdAt: string;
    salonId?: string; // For staff/owners
}

export interface Salon {
    id: string;
    slug: string;
    name: string;
    description: string;
    address: string;
    city: string;
    logoUrl?: string;
    bannerUrl?: string;
    category: string[];
    rating: number;
    reviewCount: number;
    membershipTier: 'BAS' | 'PRO' | 'LUXE';
    subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing';
    stripeCustomerId?: string;
    stripePriceId?: string;
    ownerId: string;
    createdAt: string;
}

export interface Service {
    id: string;
    salonId: string;
    name: string;
    description: string;
    price: number;
    durationMinutes: number;
    category: string;
}

export interface Appointment {
    id: string;
    salonId: string;
    serviceId: string;
    practitionerId: string;
    customerId?: string;
    customerName: string;
    customerEmail: string;
    startTime: string;
    endTime: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'paid';
    paymentId?: string;
    totalPrice: number;
    currency: string;
}

export interface GiftCard {
    id: string;
    code: string;
    value: number;
    currency: string;
    remainingBalance: number;
    recipientName: string;
    recipientEmail: string;
    senderName: string;
    message: string;
    purchasedAt: string;
    expiresAt: string;
    status: 'active' | 'used' | 'expired';
}
