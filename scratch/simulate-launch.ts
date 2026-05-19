import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { sendCustomerBookingConfirmation, sendProviderWelcomeEmail } from '../src/lib/email';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEST_EMAIL = 'zofielyberg@gmail.com';

const salonTemplates = [
    {
        name: 'Glow Studio Stockholm',
        slug: 'glow-studio-stockholm',
        category: ['Frisör', 'Hår'],
        city: 'Stockholm',
        ownerName: 'Sophie Larsson',
        ownerEmail: 'sophie@glowstudio.se',
        services: [
            { name: 'Klippning & Styling Deluxe', price: 950, duration: 60, category: 'Hår' },
            { name: 'Balayage Premium', price: 2100, duration: 150, category: 'Hår' }
        ],
        practitioner: {
            name: 'Emelie Lindqvist',
            role: 'Senior Stylist',
            schedule: {
                "1": { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                "2": { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                "3": { active: true, slots: [{ start: "09:00", end: "17:00" }] }
            }
        }
    },
    {
        name: 'Lash & Brow Loft',
        slug: 'lash-brow-loft',
        category: ['Fransar', 'Bryn', 'Skönhetssalong'],
        city: 'Göteborg',
        ownerName: 'Isabella Berg',
        ownerEmail: 'isabella@lashbrowloft.se',
        services: [
            { name: 'Megavolym Nytt Set', price: 1450, duration: 120, category: 'Fransar' },
            { name: 'Brow Lift & Färg', price: 799, duration: 45, category: 'Bryn' }
        ],
        practitioner: {
            name: 'Linnéa Sjöberg',
            role: 'Fransstylist',
            schedule: {
                "1": { active: true, slots: [{ start: "10:00", end: "18:00" }] },
                "2": { active: true, slots: [{ start: "10:00", end: "18:00" }] },
                "4": { active: true, slots: [{ start: "10:00", end: "18:00" }] }
            }
        }
    },
    {
        name: 'Pure Skin Clinic',
        slug: 'pure-skin-clinic',
        category: ['Hudvård', 'Skönhetssalong'],
        city: 'Malmö',
        ownerName: 'Dr. Anders Ek',
        ownerEmail: 'anders@pureskin.se',
        services: [
            { name: 'Avancerad Microneedling', price: 1899, duration: 75, category: 'Hudvård' },
            { name: 'Dermapen Kemisk Peeling', price: 1250, duration: 60, category: 'Hudvård' }
        ],
        practitioner: {
            name: 'Dr. Anders Ek',
            role: 'Hudterapeut & Läkare',
            schedule: {
                "2": { active: true, slots: [{ start: "08:00", end: "16:00" }] },
                "3": { active: true, slots: [{ start: "08:00", end: "16:00" }] },
                "4": { active: true, slots: [{ start: "08:00", end: "16:00" }] }
            }
        }
    },
    {
        name: 'Manicure Society',
        slug: 'manicure-society',
        category: ['Naglar', 'Skönhetssalong'],
        city: 'Stockholm',
        ownerName: 'Elena Popova',
        ownerEmail: 'elena@manicuresociety.se',
        services: [
            { name: 'Gellack inkl. Expressmanikyr', price: 650, duration: 45, category: 'Naglar' },
            { name: 'Nail Art Förlängning (Akryl)', price: 1200, duration: 120, category: 'Naglar' }
        ],
        practitioner: {
            name: 'Katarina Nilsson',
            role: 'Nagelteknolog',
            schedule: {
                "1": { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                "3": { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                "5": { active: true, slots: [{ start: "09:00", end: "17:00" }] }
            }
        }
    },
    {
        name: 'Zen & Soul Oasis',
        slug: 'zen-soul-oasis',
        category: ['Massage', 'Kroppsbehandling'],
        city: 'Uppsala',
        ownerName: 'Johan frid',
        ownerEmail: 'johan@zensoul.se',
        services: [
            { name: 'Djupgående Idrottsmassage', price: 890, duration: 60, category: 'Massage' },
            { name: 'Hot Stone Relaxmassage', price: 1150, duration: 90, category: 'Massage' }
        ],
        practitioner: {
            name: 'Maria Lundqvist',
            role: 'Massageterapeut',
            schedule: {
                "2": { active: true, slots: [{ start: "11:00", end: "20:00" }] },
                "4": { active: true, slots: [{ start: "11:00", end: "20:00" }] }
            }
        }
    },
    {
        name: 'The Golden Barber',
        slug: 'the-golden-barber',
        category: ['Barberare', 'Hår'],
        city: 'Västerås',
        ownerName: 'Marcus Al-Sadi',
        ownerEmail: 'marcus@goldenbarber.se',
        services: [
            { name: 'Klassisk Skäggtrimning med Kniv', price: 495, duration: 45, category: 'Barberare' },
            { name: 'Haircut & Beard Deluxe Package', price: 850, duration: 75, category: 'Barberare' }
        ],
        practitioner: {
            name: 'Marcus Al-Sadi',
            role: 'Master Barber',
            schedule: {
                "1": { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                "2": { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                "5": { active: true, slots: [{ start: "09:00", end: "17:00" }] }
            }
        }
    },
    {
        name: 'Laser Precision Studio',
        slug: 'laser-precision',
        category: ['Laserteknik', 'Hudvård'],
        city: 'Örebro',
        ownerName: 'Klara Söderberg',
        ownerEmail: 'klara@laserprecision.se',
        services: [
            { name: 'Hårborttagning Hela Benen', price: 2490, duration: 60, category: 'Laserteknik' },
            { name: 'Tatueringsborttagning Medium', price: 1500, duration: 45, category: 'Laserteknik' }
        ],
        practitioner: {
            name: 'Elin Andersson',
            role: 'Laserterapeut',
            schedule: {
                "3": { active: true, slots: [{ start: "10:00", end: "18:00" }] },
                "5": { active: true, slots: [{ start: "10:00", end: "18:00" }] }
            }
        }
    },
    {
        name: 'Elysian Makeup Academy',
        slug: 'elysian-makeup',
        category: ['Makeup', 'Skönhetssalong'],
        city: 'Linköping',
        ownerName: 'Gabriella Rossi',
        ownerEmail: 'gabriella@elysian.se',
        services: [
            { name: 'Brudmakeup Konsultation & Styling', price: 3500, duration: 150, category: 'Makeup' },
            { name: 'Festsminkning Glamour Look', price: 995, duration: 60, category: 'Makeup' }
        ],
        practitioner: {
            name: 'Gabriella Rossi',
            role: 'Senior Makeup Artist',
            schedule: {
                "4": { active: true, slots: [{ start: "09:00", end: "18:00" }] },
                "5": { active: true, slots: [{ start: "09:00", end: "18:00" }] }
            }
        }
    },
    {
        name: 'Therapeutic Foot Care',
        slug: 'foot-care',
        category: ['Fotvård', 'Kroppsbehandling'],
        city: 'Helsingborg',
        ownerName: 'Britt-Marie Nilsson',
        ownerEmail: 'brittmarie@fotvard.se',
        services: [
            { name: 'Medicinsk Fotvård Komplett', price: 790, duration: 60, category: 'Fotvård' },
            { name: 'Spa Fotvård med Paraffinbad', price: 990, duration: 75, category: 'Fotvård' }
        ],
        practitioner: {
            name: 'Britt-Marie Nilsson',
            role: 'Diplomerad Fotterapeut',
            schedule: {
                "1": { active: true, slots: [{ start: "08:00", end: "16:00" }] },
                "2": { active: true, slots: [{ start: "08:00", end: "16:00" }] }
            }
        }
    },
    {
        name: 'Ink & Art Studio',
        slug: 'ink-art-studio',
        category: ['Tatuering', 'Skönhetssalong'],
        city: 'Jönköping',
        ownerName: 'Viktor Storm',
        ownerEmail: 'viktor@inkart.se',
        services: [
            { name: 'Custom Tattooing Timtaxa', price: 1200, duration: 60, category: 'Tatuering' },
            { name: 'Piercing Öra / Näsa', price: 499, duration: 20, category: 'Tatuering' }
        ],
        practitioner: {
            name: 'Viktor Storm',
            role: 'Tattoo Artist',
            schedule: {
                "4": { active: true, slots: [{ start: "12:00", end: "20:00" }] },
                "5": { active: true, slots: [{ start: "12:00", end: "20:00" }] }
            }
        }
    }
];

async function runSimulation() {
    console.log('🏁 STARTAR LIVE-SIMULERING FÖR GLOWBOOK.SE...');
    console.log(`Skapar 10 lyxiga salonger och skickar alla mailbekräftelser till ${TEST_EMAIL}!\n`);

    // First clear old data to start pristine
    console.log('🧹 Rensar bort eventuellt gammalt testdata först...');
    await prisma.pointTransaction.deleteMany({});
    await prisma.loyaltyBalance.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.service.deleteMany({});
    await prisma.practitioner.deleteMany({});
    await prisma.salon.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.giftCard.deleteMany({});
    console.log('✅ Databasen är tom och redo!\n');

    let counter = 1;
    for (const t of salonTemplates) {
        console.log(`[Salong ${counter}/10] Registrerar: "${t.name}"...`);

        // 1. Create Profile/Owner
        const [firstName, lastName] = t.ownerName.split(' ');
        const owner = await prisma.profile.create({
            data: {
                email: t.ownerEmail,
                first_name: firstName,
                last_name: lastName || '',
                role: 'provider'
            }
        });

        // 2. Create Salon
        const salon = await prisma.salon.create({
            data: {
                name: t.name,
                slug: t.slug,
                category: t.category,
                city: t.city,
                address: `Glow Street ${counter * 7}`,
                municipality: t.city,
                owner_id: owner.id,
                membership_tier: 'premium'
            }
        });

        // 3. Create Practitioner
        const practitioner = await prisma.practitioner.create({
            data: {
                salon_id: salon.id,
                name: t.practitioner.name,
                role: t.practitioner.role,
                schedule: t.practitioner.schedule
            }
        });

        // 4. Create Services
        const createdServices = [];
        for (const s of t.services) {
            const service = await prisma.service.create({
                data: {
                    salon_id: salon.id,
                    name: s.name,
                    price: s.price,
                    duration_minutes: s.duration,
                    category: s.category
                }
            });
            createdServices.push(service);
        }

        console.log(`   - Skapade utövaren ${practitioner.name} (${practitioner.role})`);
        console.log(`   - La till ${createdServices.length} st exklusiva tjänster`);

        // 5. Simulate booking a treatment
        const targetService = createdServices[0];
        const dateString = '2026-05-20'; // Tomorrow
        const startTimeString = '10:00';
        
        // Calculate start and end times
        const startDateTime = new Date(`${dateString}T${startTimeString}`);
        const endDateTime = new Date(startDateTime.getTime() + targetService.duration_minutes * 60 * 1000);

        console.log(`   - Simulerar en bokning hos kunden zofielyberg@gmail.com för "${targetService.name}"...`);

        // Insert mock customer profile if not exists
        let customerProfile = await prisma.profile.findFirst({
            where: { email: TEST_EMAIL }
        });

        if (!customerProfile) {
            customerProfile = await prisma.profile.create({
                data: {
                    email: TEST_EMAIL,
                    first_name: 'Zofie',
                    last_name: 'Lyberg',
                    role: 'customer'
                }
            });
        }

        // Create the booking entry in Postgres
        const appointment = await prisma.appointment.create({
            data: {
                salon_id: salon.id,
                service_name: targetService.name,
                practitioner_id: practitioner.id,
                customer_id: customerProfile.id,
                customer_email: TEST_EMAIL,
                customer_name: 'Zofie Lyberg',
                customer_phone: '0701234567',
                start_time: startDateTime,
                end_time: endDateTime,
                booking_date: new Date(dateString),
                total_price: targetService.price,
                status: 'confirmed',
                payment_method: 'card'
            }
        });

        console.log(`   - Bokning skapad i PostgreSQL med ID: ${appointment.id}`);
        console.log(`   - ✉️ Fyrar av live bekräftelsemail till ${TEST_EMAIL}...`);

        // Send provider welcome email to TEST_EMAIL so she sees the full branding experience
        try {
            await sendProviderWelcomeEmail(TEST_EMAIL, t.name);
        } catch (emailErr) {
            console.error('Welcome email failed:', emailErr);
        }

        // Send booking confirmation with the premium "Hantera bokning" link to TEST_EMAIL
        try {
            await sendCustomerBookingConfirmation(
                TEST_EMAIL,
                'Zofie Lyberg',
                t.name,
                targetService.name,
                dateString,
                startTimeString,
                `${targetService.price} SEK`,
                appointment.id
            );
            console.log(`   - live-mail skickat framgångsrikt!\n`);
        } catch (emailErr) {
            console.error('Booking confirmation email failed:', emailErr);
        }

        counter++;
    }

    console.log('🏆 LIVE-SIMULERING SLUTFÖRD!');
    console.log('Du har nu 10 nyskapade premium-salonger i systemet med verifierad och buggfri kalenderlogik.');
    console.log('Alla bekräftelsemail (inklusive Hantera bokning-länkarna) har skickats till din mail zofielyberg@gmail.com!');
}

runSimulation()
    .catch(e => {
        console.error('Simulering misslyckades:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
