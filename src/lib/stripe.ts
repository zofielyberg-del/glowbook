import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mockKey1234567890', {
    apiVersion: '2023-10-16' as any, // Use a stable version
    typescript: true,
});
