import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { sendCustomerWelcomeEmail } from '@/lib/email';
import { triggerAccountCreatedReward } from '@/lib/rewards-service';
import { slugifySalonName } from '@/lib/slug';

export async function POST(req: Request) {
    try {
        const { email, firstName, lastName, phone, role, country, municipality, password } = await req.json();

        const normalizedEmail = (email || '').toLowerCase().trim();

        if (!normalizedEmail || !firstName?.trim() || !lastName?.trim() || !role) {
            return NextResponse.json({ error: 'Vänligen fyll i alla obligatoriska fält' }, { status: 400 });
        }

        if (!password || String(password).trim().length < 6) {
            return NextResponse.json({ error: 'Lösenordet måste vara minst 6 tecken långt' }, { status: 400 });
        }

        const existingProfile = await prisma.profile.findFirst({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            select: { id: true, password_hash: true, first_name: true, last_name: true, phone: true, role: true },
        });

        if (existingProfile && existingProfile.password_hash) {
            return NextResponse.json(
                { error: 'Det finns redan ett konto med denna e-postadress. Vänligen logga in.' },
                { status: 400 }
            );
        }

        const passwordHash = hashPassword(String(password));
        const isProvider = role === 'provider' || role === 'salon_owner';
        const baseSlug = slugifySalonName(`${firstName} beauty`) || 'studio';
        const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

        let result: { profile: any; salon: any };
        try {
            result = await prisma.$transaction(async (tx) => {
                let profile;
                if (existingProfile) {
                    profile = await tx.profile.update({
                        where: { id: existingProfile.id },
                        data: {
                            first_name: firstName.trim() || existingProfile.first_name,
                            last_name: lastName.trim() || existingProfile.last_name,
                            phone: phone?.trim() || existingProfile.phone,
                            role: role || existingProfile.role || 'customer',
                            password_hash: passwordHash,
                        },
                    });
                } else {
                    profile = await tx.profile.create({
                        data: {
                            email: normalizedEmail,
                            first_name: firstName.trim(),
                            last_name: lastName.trim(),
                            phone: phone?.trim() || null,
                            role,
                            password_hash: passwordHash,
                        },
                    });
                }

                let salon = null;
                if (isProvider) {
                    salon = await tx.salon.create({
                        data: {
                            owner_id: profile.id,
                            name: `${firstName.trim()} Beauty`,
                            slug: uniqueSlug,
                            country: country || 'Sverige',
                            municipality: municipality || '',
                            city: municipality || '',
                            subscription_status: 'unpaid',
                            membership_tier: 'bas',
                            duration: 1,
                            practitioners: {
                                create: {
                                    name: firstName.trim(),
                                    role: 'Owner',
                                    status: 'active',
                                },
                            },
                        },
                    });
                }

                return { profile, salon };
            });
        } catch (txError: any) {
            console.error('Registration transaction error:', txError);
            return NextResponse.json(
                { success: false, error: 'Kunde inte slutföra registreringen. Försök igen.' },
                { status: 500 }
            );
        }

        // Award +100 welcome points for customer registrations
        if (!isProvider) {
            await triggerAccountCreatedReward(result.profile.id);
            try {
                await sendCustomerWelcomeEmail(normalizedEmail, firstName.trim());
            } catch (emailErr) {
                console.error('Failed to send customer welcome email:', emailErr);
            }
        }

        return NextResponse.json({
            success: true,
            user: result.profile,
            salon: result.salon,
        });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
