import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { sendProviderWelcomeEmail, sendCustomerWelcomeEmail } from '@/lib/email';
import { triggerAccountCreatedReward } from '@/lib/rewards-service';

export async function POST(req: Request) {
    try {
        const { email, firstName, lastName, phone, role, country, municipality, password } = await req.json();

        const normalizedEmail = (email || '').toLowerCase().trim();

        if (!normalizedEmail || !firstName || !lastName || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Check if profile already exists (case-insensitive check)
        const existingProfile = await prisma.profile.findFirst({
             where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
             select: { id: true, password_hash: true, first_name: true, last_name: true, phone: true, role: true }
        });

        if (existingProfile && existingProfile.password_hash) {
            return NextResponse.json({ error: 'Det finns redan ett konto med denna e-postadress. Vänligen logga in.' }, { status: 400 });
        }

        // 2. Create or Update Profile
        let profile;
        try {
            if (existingProfile) {
                // Profile exists from guest booking (no password set yet) - activate it
                profile = await prisma.profile.update({
                    where: { id: existingProfile.id },
                    data: {
                        first_name: firstName || existingProfile.first_name,
                        last_name: lastName || existingProfile.last_name,
                        phone: phone || existingProfile.phone,
                        role: role || existingProfile.role || 'customer',
                        password_hash: password ? hashPassword(password) : null
                    }
                });
            } else {
                profile = await prisma.profile.create({
                    data: {
                        email: normalizedEmail,
                        first_name: firstName,
                        last_name: lastName,
                        phone,
                        role,
                        password_hash: password ? hashPassword(password) : null
                    }
                });
            }
        } catch (profileError) {
            console.error('Profile creation error:', profileError);
            return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
        }

        // Award +100 welcome points to user_rewards_ledger
        await triggerAccountCreatedReward(profile.id);

        // 3. If Provider, create Salon
        let salon = null;
        if (role === 'provider' || role === 'salon_owner') {
            try {
                console.log(`CREATING SALON FOR USER ${profile.id}...`);
                salon = await prisma.salon.create({
                    data: {
                        owner_id: profile.id,
                        name: `${firstName} Beauty`, 
                        slug: `${firstName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-beauty-${Date.now()}`,
                        country: country || 'Sweden',
                        municipality: municipality || '',
                        city: municipality || '',
                        subscription_status: 'unpaid',
                        membership_tier: 'bas',
                        practitioners: {
                            create: {
                                name: firstName,
                                role: 'Owner',
                                status: 'active'
                            }
                        }
                    }
                });
                console.log('SALON & PRACTITIONER CREATED SUCCESSFULLY:', salon.id);

                // Welcome email is sent via Stripe webhook after payment confirmation

            } catch (salonError) {
                console.error('CRITICAL SALON CREATION ERROR:', salonError);
                return NextResponse.json({ 
                    success: false, 
                    error: 'Kunde inte skapa salongen i databasen: ' + String(salonError) 
                }, { status: 500 });
            }
        } else if (role === 'customer') {
            // Send Welcome Email to the Customer
            try {
                await sendCustomerWelcomeEmail(email, firstName);
                console.log(`Customer welcome email successfully sent to ${email}`);
            } catch (emailErr) {
                console.error('Failed to send customer welcome email:', emailErr);
            }
        }

        return NextResponse.json({
            success: true,
            user: profile,
            salon: salon // Now explicitly returning the created salon
        });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
