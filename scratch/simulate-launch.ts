import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { sendCustomerBookingConfirmation, sendProviderWelcomeEmail } from '../src/lib/email.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEST_EMAIL = 'zofielyberg@gmail.com';

const CUSTOMERS = [
    { email: 'zofielyberg@gmail.com', first_name: 'Zofie', last_name: 'Lyberg', phone: '0701234567' },
    { email: 'emma.karlsson@gmail.com', first_name: 'Emma', last_name: 'Karlsson', phone: '0711112222' },
    { email: 'linus.johansson@gmail.com', first_name: 'Linus', last_name: 'Johansson', phone: '0722223333' },
    { email: 'sara.lund@gmail.com', first_name: 'Sara', last_name: 'Lund', phone: '0733334444' },
    { email: 'oskar.nilsson@gmail.com', first_name: 'Oskar', last_name: 'Nilsson', phone: '0744445555' },
    { email: 'julia.berg@gmail.com', first_name: 'Julia', last_name: 'Berg', phone: '0755556666' },
    { email: 'david.gustafsson@gmail.com', first_name: 'David', last_name: 'Gustafsson', phone: '0766667777' },
    { email: 'sofia.lind@gmail.com', first_name: 'Sofia', last_name: 'Lind', phone: '0777778888' },
    { email: 'viktor.eriksson@gmail.com', first_name: 'Viktor', last_name: 'Eriksson', phone: '0788889999' },
    { email: 'amanda.sandin@gmail.com', first_name: 'Amanda', last_name: 'Sandin', phone: '0799990000' }
];

const salonTemplates = [
    {
        name: 'Glow Studio Stockholm',
        slug: 'glow-studio-stockholm',
        category: 'Hårvård',
        categories: ['Hårvård', 'Frisör', 'Skönhetssalong'],
        city: 'Stockholm',
        address: 'Biblioteksgatan 8',
        tier: 'luxe',
        logo_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=150&q=80',
        banner_url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=80',
        ownerName: 'Sophie Larsson',
        ownerEmail: 'sophie@glowstudio.se',
        services: [
            { name: 'Klippning & Styling Deluxe', price: 950, duration: 60, category: 'Hårvård', description: 'Lyxig klippning inklusive tvätt, härlig huvudmassage och styling.' },
            { name: 'Balayage Premium', price: 2100, duration: 150, category: 'Hårvård', description: 'Avancerad frihandspensling för naturliga solkyssta skiftningar. Nyansering ingår.' },
            { name: 'Olaplex Intensivbehandling', price: 750, duration: 45, category: 'Hårvård', description: 'Stärkande och reparerande salongsbehandling för skadat hår.' }
        ],
        practitioners: [
            { name: 'Sophie Larsson', role: 'Owner & Master Stylist', image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80' },
            { name: 'Emelie Lindqvist', role: 'Senior Stylist', image_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80' },
            { name: 'Lucas Berg', role: 'Colorist Specialist', image_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80' }
        ]
    },
    {
        name: 'Lash & Brow Loft',
        slug: 'lash-brow-loft',
        category: 'Fransar & Bryn',
        categories: ['Fransar & Bryn', 'Skönhetssalong'],
        city: 'Göteborg',
        address: 'Avenyn 12',
        tier: 'pro',
        logo_url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=150&q=80',
        banner_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
        ownerName: 'Isabella Berg',
        ownerEmail: 'isabella@lashbrowloft.se',
        services: [
            { name: 'Megavolym Nytt Set', price: 1450, duration: 120, category: 'Fransar & Bryn', description: 'Fylliga, fjäderlätta fransar med maximal volym och lyxig känsla.' },
            { name: 'Brow Lift & Färg', price: 799, duration: 45, category: 'Fransar & Bryn', description: 'Permanering och färgning av brynen för en perfekt fyllig form som håller i veckor.' },
            { name: 'Lash Lift & Keratin', price: 699, duration: 60, category: 'Fransar & Bryn', description: 'Permanent böjning av dina naturliga fransar samt vårdande keratinbehandling.' }
        ],
        practitioners: [
            { name: 'Isabella Berg', role: 'Owner & Lash Artist', image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80' }
        ]
    },
    {
        name: 'Pure Skin Clinic',
        slug: 'pure-skin-clinic',
        category: 'Hudvård',
        categories: ['Hudvård', 'Skönhetssalong'],
        city: 'Malmö',
        address: 'Södergatan 4',
        tier: 'luxe',
        logo_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=150&q=80',
        banner_url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=80',
        ownerName: 'Dr. Anders Ek',
        ownerEmail: 'anders@pureskin.se',
        services: [
            { name: 'Avancerad Microneedling', price: 1899, duration: 75, category: 'Hudvård', description: 'Kollagenstimulerande behandling med Dermapen. Förbättrar hudstruktur, linjer och ärr.' },
            { name: 'Dermapen Kemisk Peeling', price: 1250, duration: 60, category: 'Hudvård', description: 'Djupgående exfoliering som ger huden ny lyster och jämnare ton.' },
            { name: 'Klassisk Ansiktsbehandling', price: 890, duration: 60, category: 'Hudvård', description: 'Djuprengöring, peeling, portömning, mask och härlig ansiktsmassage.' }
        ],
        practitioners: [
            { name: 'Dr. Anders Ek', role: 'Clinic Director / MD', image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80' },
            { name: 'Sophia Vester', role: 'Aesthetician', image_url: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&w=150&q=80' }
        ]
    },
    {
        name: 'Manicure Society',
        slug: 'manicure-society',
        category: 'Naglar',
        categories: ['Naglar', 'Skönhetssalong'],
        city: 'Stockholm',
        address: 'Birger Jarlsgatan 14',
        tier: 'pro',
        logo_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=150&q=80',
        banner_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=1200&q=80',
        ownerName: 'Elena Popova',
        ownerEmail: 'elena@manicuresociety.se',
        services: [
            { name: 'Gellack inkl. Expressmanikyr', price: 650, duration: 45, category: 'Naglar', description: 'Slitstarkt gellack som håller glansen i upp till 4 veckor.' },
            { name: 'Nail Art Förlängning (Akryl)', price: 1200, duration: 120, category: 'Naglar', description: 'Nagelförlängning med vackra handmålade mönster och glitterdetaljer.' }
        ],
        practitioners: [
            { name: 'Elena Popova', role: 'Master Nail Stylist', image_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=150&q=80' }
        ]
    },
    {
        name: 'Zen & Soul Oasis',
        slug: 'zen-soul-oasis',
        category: 'Massage',
        categories: ['Massage', 'Kroppsbehandling'],
        city: 'Uppsala',
        address: 'Drottninggatan 3',
        tier: 'bas',
        logo_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=150&q=80',
        banner_url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=1200&q=80',
        ownerName: 'Johan Frid',
        ownerEmail: 'johan@zensoul.se',
        services: [
            { name: 'Djupgående Idrottsmassage', price: 890, duration: 60, category: 'Massage', description: 'Behandlande massage inriktad på stela muskler och muskelknutor.' },
            { name: 'Hot Stone Relaxmassage', price: 1150, duration: 90, category: 'Massage', description: 'Avslappnande massage med varma lavastenar och välgörande aromatiska oljor.' }
        ],
        practitioners: [
            { name: 'Johan Frid', role: 'Massage Therapist', image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' }
        ]
    },
    {
        name: 'The Golden Barber',
        slug: 'the-golden-barber',
        category: 'Barberare',
        categories: ['Barberare', 'Hårvård'],
        city: 'Västerås',
        address: 'Stora Gatan 22',
        tier: 'pro',
        logo_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=150&q=80',
        banner_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
        ownerName: 'Marcus Al-Sadi',
        ownerEmail: 'marcus@goldenbarber.se',
        services: [
            { name: 'Klassisk Skäggtrimning med Kniv', price: 495, duration: 45, category: 'Barberare', description: 'Trimning och formning av skägget med kniv, varma handdukar och lyxig skäggolja.' },
            { name: 'Haircut & Beard Deluxe Package', price: 850, duration: 75, category: 'Barberare', description: 'Hårklippning och skäggtrimning i ett exklusivt paket inklusive massage och tvätt.' }
        ],
        practitioners: [
            { name: 'Marcus Al-Sadi', role: 'Master Barber', image_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80' }
        ]
    },
    {
        name: 'Laser Precision Studio',
        slug: 'laser-precision',
        category: 'Skönhetssalong',
        categories: ['Skönhetssalong', 'Hudvård'],
        city: 'Örebro',
        address: 'Kungsgatan 7',
        tier: 'bas',
        logo_url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=150&q=80',
        banner_url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80',
        ownerName: 'Klara Söderberg',
        ownerEmail: 'klara@laserprecision.se',
        services: [
            { name: 'Hårborttagning Hela Benen', price: 2490, duration: 60, category: 'Skönhetssalong', description: 'Permanent hårborttagning med marknadens säkraste och mest effektiva lasermaskin.' },
            { name: 'Tatueringsborttagning Medium', price: 1500, duration: 45, category: 'Skönhetssalong', description: 'Skonsam laserbehandling som bleker eller tar bort din tatuering helt utan ärrbildning.' }
        ],
        practitioners: [
            { name: 'Klara Söderberg', role: 'Laser Specialist', image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' }
        ]
    },
    {
        name: 'Elysian Makeup Academy',
        slug: 'elysian-makeup',
        category: 'Makeup',
        categories: ['Makeup', 'Skönhetssalong'],
        city: 'Linköping',
        address: 'Storgatan 15',
        tier: 'luxe',
        logo_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=150&q=80',
        banner_url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1200&q=80',
        ownerName: 'Gabriella Rossi',
        ownerEmail: 'gabriella@elysian.se',
        services: [
            { name: 'Brudmakeup Konsultation & Styling', price: 3500, duration: 150, category: 'Makeup', description: 'Exklusiv brudsminkning inklusive en noggrann provsminkning inför bröllopet.' },
            { name: 'Festsminkning Glamour Look', price: 995, duration: 60, category: 'Makeup', description: 'Kvällsmakeup med snygg contouring, skimrande ögonmakeup och fransar.' }
        ],
        practitioners: [
            { name: 'Gabriella Rossi', role: 'Owner & Senior Makeup Artist', image_url: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&w=150&q=80' },
            { name: 'Bianca Russo', role: 'Makeup Artist', image_url: 'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=150&q=80' }
        ]
    },
    {
        name: 'Therapeutic Foot Care',
        slug: 'foot-care',
        category: 'Fotvård',
        categories: ['Fotvård', 'Kroppsbehandling'],
        city: 'Helsingborg',
        address: 'Järnvägsgatan 9',
        tier: 'bas',
        logo_url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=150&q=80',
        banner_url: 'https://images.unsplash.com/photo-1490818383965-f24b8ea572d5?auto=format&fit=crop&w=1200&q=80',
        ownerName: 'Britt-Marie Nilsson',
        ownerEmail: 'brittmarie@fotvard.se',
        services: [
            { name: 'Medicinsk Fotvård Komplett', price: 790, duration: 60, category: 'Fotvård', description: 'Behandling av naglar, förhårdnader, liktornar och fotsprickor. Avslutas med massage.' },
            { name: 'Spa Fotvård med Paraffinbad', price: 990, duration: 75, category: 'Fotvård', description: 'Fotbad, peeling, nagelvård, vårdande inpackning och djupt värmande paraffinbad.' }
        ],
        practitioners: [
            { name: 'Britt-Marie Nilsson', role: 'Diplomerad Fotterapeut', image_url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=150&q=80' }
        ]
    },
    {
        name: 'Ink & Art Studio',
        slug: 'ink-art-studio',
        category: 'Tatuering',
        categories: ['Tatuering', 'Skönhetssalong'],
        city: 'Jönköping',
        address: 'Västra Storgatan 1',
        tier: 'pro',
        logo_url: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=150&q=80',
        banner_url: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?auto=format&fit=crop&w=1200&q=80',
        ownerName: 'Viktor Storm',
        ownerEmail: 'viktor@inkart.se',
        services: [
            { name: 'Custom Tattooing Timtaxa', price: 1200, duration: 60, category: 'Tatuering', description: 'Unika och anpassade motiv. Priset är baserat per timme av aktiv tatuerande.' },
            { name: 'Piercing Öra / Näsa', price: 499, duration: 20, category: 'Tatuering', description: 'Professionell piercing med steril nål och högkvalitativa smycken i titan.' }
        ],
        practitioners: [
            { name: 'Viktor Storm', role: 'Tattoo Artist', image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80' }
        ]
    }
];

// Shared weekly availability frames (Mon-Fri 09:00 - 17:00)
const getAvailability = () => [
    { id: "mon", dayIndex: 0, startTime: "09:00", duration: 480 },
    { id: "tue", dayIndex: 1, startTime: "09:00", duration: 480 },
    { id: "wed", dayIndex: 2, startTime: "09:00", duration: 480 },
    { id: "thu", dayIndex: 3, startTime: "09:00", duration: 480 },
    { id: "fri", dayIndex: 4, startTime: "09:00", duration: 480 }
];

// Helper to generate practitioner schedule matching the availability frames
const getSchedule = () => ({
    "0": { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    "1": { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    "2": { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    "3": { active: true, slots: [{ start: "09:00", end: "17:00" }] },
    "4": { active: true, slots: [{ start: "09:00", end: "17:00" }] }
});

async function runSimulation() {
    console.log('🏁 STARTAR FÖRBÄTTRAD OCH FULLSTÄNDIG SEEDNING OF GLOWBOOK...');
    console.log(`Rensar gammal data och bygger en bokningsmiljö...\n`);

    // 1. Clear database
    await prisma.pointTransaction.deleteMany({});
    await prisma.loyaltyBalance.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.service.deleteMany({});
    await prisma.practitioner.deleteMany({});
    await prisma.salon.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.giftCard.deleteMany({});
    console.log('🧹 Databasen är tom och ren!');

    // 2. Seed Customers
    const createdCustomers = [];
    for (const c of CUSTOMERS) {
        const customer = await prisma.profile.create({
            data: {
                email: c.email,
                first_name: c.first_name,
                last_name: c.last_name,
                phone: c.phone,
                role: 'customer',
                total_points_earned: 350
            }
        });
        createdCustomers.push(customer);
    }
    console.log(`👥 Skapade ${createdCustomers.length} st aktiva testkunder med sparade poäng.`);

    // 3. Seed Gift Cards
    const giftCodes = ['GLOW-LOVE', 'XMAS2026', 'BEAUTY-100', 'GOLD-VIP', 'SPRING26'];
    for (const code of giftCodes) {
        await prisma.giftCard.create({
            data: {
                code,
                value: 500,
                remaining_balance: 500,
                recipient_name: 'Zofie Lyberg',
                recipient_email: TEST_EMAIL,
                sender_name: 'Glowbook Team'
            }
        });
    }
    console.log(`🎁 Skapade ${giftCodes.length} st aktiva presentkort (t.ex. 'GLOW-LOVE' värde 500 kr).`);

    // 4. Seed Salons, Practitioners, Services & Appointments
    let salonCounter = 1;
    for (const t of salonTemplates) {
        console.log(`\n🏢 [Salong ${salonCounter}/10] Bygger: "${t.name}" (${t.tier.toUpperCase()})...`);

        // A. Create Owner Profile
        const [firstName, lastName] = t.ownerName.split(' ');
        const owner = await prisma.profile.create({
            data: {
                email: t.ownerEmail,
                first_name: firstName,
                last_name: lastName || '',
                phone: '0700000000',
                role: 'provider'
            }
        });

        // B. Create Salon
        const salon = await prisma.salon.create({
            data: {
                name: t.name,
                slug: t.slug,
                category: t.categories, // Safe array
                categories: t.categories,
                city: t.city,
                address: t.address,
                municipality: t.city,
                country: 'Sverige',
                owner_id: owner.id,
                membership_tier: t.tier,
                subscription_status: 'active',
                logo_url: t.logo_url,
                banner_url: t.banner_url,
                rating: 4.8,
                review_count: 14 + salonCounter * 3,
                availability: getAvailability(), // Standard weekly opening frames!
                cancellation_window_hours: 24,
                duration: 12
            }
        });

        // C. Create Practitioners
        const createdPractitioners = [];
        for (const p of t.practitioners) {
            const prac = await prisma.practitioner.create({
                data: {
                    salon_id: salon.id,
                    name: p.name,
                    role: p.role,
                    image_url: p.image_url,
                    status: 'active',
                    schedule: getSchedule(), // 0-4 matching Mon-Fri availability!
                    categories: t.categories
                }
            });
            createdPractitioners.push(prac);
        }
        console.log(`   - Skapade ${createdPractitioners.length} utövare med schema & profilbilder.`);

        // D. Create Services
        const createdServices = [];
        for (const s of t.services) {
            const serv = await prisma.service.create({
                data: {
                    salon_id: salon.id,
                    name: s.name,
                    description: s.description,
                    price: s.price,
                    duration_minutes: s.duration,
                    category: s.category
                }
            });
            createdServices.push(serv);
        }
        console.log(`   - La till ${createdServices.length} st professionella tjänster.`);

        // E. Create Loyalty balance config
        for (const c of createdCustomers) {
            await prisma.loyaltyBalance.create({
                data: {
                    salon_id: salon.id,
                    profile_id: c.id,
                    current_points: 150,
                    total_earned: 150
                }
            });
        }

        // F. Seed Appointments (Both Historical and Future!)
        console.log(`   - Simulerar bokningar (historiska för omsättning, framtida för kalendern)...`);
        
        // Let's create 4 historical bookings (past 30 days) and 2 future bookings (next 7 days)
        const today = new Date();
        
        // Past Bookings (Omsättningsstatistik)
        for (let i = 1; i <= 4; i++) {
            const randomCust = createdCustomers[i % createdCustomers.length];
            const randomPrac = createdPractitioners[i % createdPractitioners.length];
            const randomServ = createdServices[i % createdServices.length];
            
            const bookingDate = new Date();
            bookingDate.setDate(today.getDate() - (i * 5)); // e.g. 5, 10, 15, 20 days ago
            bookingDate.setHours(9 + i, 0, 0, 0); // e.g. 10:00, 11:00, 12:00, 13:00

            const endDateTime = new Date(bookingDate.getTime() + randomServ.duration_minutes * 60 * 1000);

            await prisma.appointment.create({
                data: {
                    salon_id: salon.id,
                    service_id: randomServ.id,
                    service_name: randomServ.name,
                    practitioner_id: randomPrac.id,
                    customer_id: randomCust.id,
                    customer_name: `${randomCust.first_name} ${randomCust.last_name}`,
                    customer_email: randomCust.email,
                    customer_phone: randomCust.phone,
                    start_time: bookingDate,
                    end_time: endDateTime,
                    booking_date: bookingDate,
                    total_price: randomServ.price,
                    status: 'confirmed',
                    payment_method: 'card'
                }
            });
        }

        // Future Bookings (Kalendern & Kundregister)
        for (let i = 1; i <= 2; i++) {
            const randomCust = createdCustomers[(i + 4) % createdCustomers.length];
            const randomPrac = createdPractitioners[i % createdPractitioners.length];
            const randomServ = createdServices[0]; // Primary service
            
            const bookingDate = new Date();
            bookingDate.setDate(today.getDate() + i); // 1 or 2 days in the future
            bookingDate.setHours(10 + i, 0, 0, 0); // 11:00 or 12:00

            const endDateTime = new Date(bookingDate.getTime() + randomServ.duration_minutes * 60 * 1000);

            const appt = await prisma.appointment.create({
                data: {
                    salon_id: salon.id,
                    service_id: randomServ.id,
                    service_name: randomServ.name,
                    practitioner_id: randomPrac.id,
                    customer_id: randomCust.id,
                    customer_name: `${randomCust.first_name} ${randomCust.last_name}`,
                    customer_email: randomCust.email,
                    customer_phone: randomCust.phone,
                    start_time: bookingDate,
                    end_time: endDateTime,
                    booking_date: bookingDate,
                    total_price: randomServ.price,
                    status: 'confirmed',
                    payment_method: 'card'
                }
            });

            // Send booking e-mail to Zofie's live email for the first salon so she gets booking details instantly
            if (salonCounter === 1 && i === 1) {
                const dateStr = bookingDate.toISOString().split('T')[0];
                const timeStr = bookingDate.toTimeString().split(' ')[0].substring(0, 5);
                
                try {
                    await sendProviderWelcomeEmail(TEST_EMAIL, t.name);
                    await sendCustomerBookingConfirmation(
                        TEST_EMAIL,
                        'Zofie Lyberg',
                        t.name,
                        randomServ.name,
                        dateStr,
                        timeStr,
                        `${randomServ.price} SEK`,
                        appt.id
                    );
                    console.log(`   - ✉️ Fyrade av live bekräftelsemail till ${TEST_EMAIL}!`);
                } catch (emailErr) {
                    console.warn('E-post kunde inte skickas:', emailErr);
                }
            }
        }

        console.log(`   - Lyckades simulera 6 st bokningar (4 st historiska, 2 st framtida).`);
        salonCounter++;
    }

    console.log('\n🏆 SEEDNINGEN ÄR HELT SLUTFÖRD OCH VERIFIERAD!');
    console.log('Du har nu en blomstrande plattform med:');
    console.log(' - 10 st lyxiga och fullt konfigurerade skönhetssalonger');
    console.log(' - 10 st aktiva kunder med sparade lojalitetspoäng');
    console.log(' - 60 st bokade tider (både historik för grafer och framtida för kalendern)');
    console.log(' - 5 st unika presentkort som går att lösa in direkt');
    console.log('\nAllt är sammankopplat och redo att användas som ett vardagsverktyg för beautybranschen! 💫');
}

runSimulation()
    .catch(e => {
        console.error('Seed-fel:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
