import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

const SALON_NAMES = [
    "Nordic Glow", "Stureplans Skönhet", "Serenity Spa", "Lumière Estetik", 
    "Sthlm Beauty Co.", "The Skin Clinic", "Aura Wellness", "Pure Elegance", 
    "Velvet Studio", "Glow & Go"
];

export async function POST(req: Request) {
    try {
        const hashedPassword = hashPassword('Glowbook123!');
        const seededSalons = [];

        const defaultSchedule = {
            "1": { active: true, slots: [{ start: "10:00", end: "19:00" }] },
            "2": { active: true, slots: [{ start: "10:00", end: "19:00" }] },
            "3": { active: true, slots: [{ start: "10:00", end: "19:00" }] },
            "4": { active: true, slots: [{ start: "10:00", end: "19:00" }] },
            "5": { active: true, slots: [{ start: "10:00", end: "19:00" }] },
            "6": { active: false, slots: [] },
            "0": { active: false, slots: [] }
        };

        for (let i = 0; i < 10; i++) {
            const name = SALON_NAMES[i];
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const email = `test${i+1}@${slug}.se`;

            // Create Profile
            const profile = await prisma.profile.create({
                data: {
                    email,
                    first_name: 'Test',
                    last_name: `User ${i+1}`,
                    phone: `070123456${i}`,
                    role: 'salon_owner',
                    password_hash: hashedPassword
                }
            });

            // Create Salon
            const salon = await prisma.salon.create({
                data: {
                    owner_id: profile.id,
                    name,
                    slug,
                    country: 'Sweden',
                    city: 'Stockholm',
                    municipality: 'Stockholm',
                    subscription_status: 'active',
                    membership_tier: 'luxe',
                    is_verified: true,
                    practitioners: {
                        create: {
                            name: `Test Utförare ${i+1}`,
                            role: 'Owner',
                            status: 'active',
                            schedule: defaultSchedule
                        }
                    },
                    services: {
                        create: [
                            {
                                name: 'Klassisk Massage',
                                duration_minutes: 60,
                                price: 799,
                                category: 'Massage'
                            },
                            {
                                name: 'Ansiktsbehandling Glow',
                                duration_minutes: 45,
                                price: 599,
                                category: 'Hudvård'
                            }
                        ]
                    }
                },
                include: { practitioners: true }
            });

            seededSalons.push(salon);
        }

        return NextResponse.json({ success: true, message: `Seeded 10 salons successfully.` });
    } catch (error: any) {
        console.error('Seed DB Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
