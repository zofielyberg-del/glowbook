import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { sendProviderWelcomeEmail, sendCustomerWelcomeEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { email, firstName, lastName, phone, role, country, municipality, password } = await req.json();

        if (!email || !firstName || !lastName || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Check if profile already exists
        const existingProfile = await prisma.profile.findUnique({
             where: { email },
             select: { id: true }
        });

        if (existingProfile) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        // 2. Create Profile
        let profile;
        try {
            profile = await prisma.profile.create({
                data: {
                    email,
                    first_name: firstName,
                    last_name: lastName,
                    phone,
                    role,
                    password_hash: password ? hashPassword(password) : null
                }
            });
        } catch (profileError) {
            console.error('Profile creation error:', profileError);
            return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
        }

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
                        subscription_status: 'trialing',
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

                // Send Welcome Email to the Provider
                try {
                    await sendProviderWelcomeEmail(email, salon.name);
                    console.log(`Welcome email successfully sent to ${email}`);
                } catch (emailErr) {
                    console.error('Failed to send welcome email:', emailErr);
                }

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
