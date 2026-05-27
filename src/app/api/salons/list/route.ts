
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';


export const revalidate = 60; // Cache for 60 seconds

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const municipality = searchParams.get('municipality');
        const query = searchParams.get('q');

        const where: Prisma.SalonWhereInput = {
            AND: []
        };

        // 1. Handle Query (Smart, Case-Insensitive Search with Synonyms and Deep Matching)
        if (query) {
            const lowerQuery = query.toLowerCase().trim();
            const queryTerms = [lowerQuery];

            // Smart synonym matching: Nagel/Naglar/Nails/Manikyr/Pedikyr/Gellack/Akryl/Gelé/Manicure/Pedicure/Shellac/Negler/Negle
            if (
                lowerQuery.includes('nagel') || 
                lowerQuery.includes('naglar') || 
                lowerQuery.includes('nails') || 
                lowerQuery.includes('manikyr') || 
                lowerQuery.includes('pedikyr') || 
                lowerQuery.includes('gellack') || 
                lowerQuery.includes('akryl') || 
                lowerQuery.includes('gelé') ||
                lowerQuery.includes('gele') ||
                lowerQuery.includes('manicure') ||
                lowerQuery.includes('pedicure') ||
                lowerQuery.includes('shellac') ||
                lowerQuery.includes('negler') ||
                lowerQuery.includes('negle') ||
                lowerQuery.includes('kynnet')
            ) {
                queryTerms.push('nails', 'naglar', 'manikyr', 'pedikyr', 'gellack', 'akryl', 'gelé', 'gele', 'nagel', 'manicure', 'pedicure', 'shellac', 'negler', 'negle', 'kynnet');
            }

            // Smart synonym matching: Fransar/Bryn/Lashes/Brows/Lashlift/Browlift/Vipper/Kulmat/Augabrúnir
            if (
                lowerQuery.includes('frans') || 
                lowerQuery.includes('bryn') || 
                lowerQuery.includes('lash') || 
                lowerQuery.includes('brow') || 
                lowerQuery.includes('lift') ||
                lowerQuery.includes('vipp') ||
                lowerQuery.includes('kulmat') ||
                lowerQuery.includes('augabrúnir') ||
                lowerQuery.includes('augabrunir')
            ) {
                queryTerms.push('lashes', 'fransar', 'bryn', 'brows', 'lashlift', 'browlift', 'vipper', 'vippeforlengelse', 'eyebrows');
            }

            // Smart synonym matching: Hår/Frisör/Klipp/Färg/Hair/Balayage/Barber/Skägg/Rakning
            if (
                lowerQuery.includes('hår') || 
                lowerQuery.includes('har') ||
                lowerQuery.includes('frisör') || 
                lowerQuery.includes('frisor') ||
                lowerQuery.includes('klipp') || 
                lowerQuery.includes('färg') || 
                lowerQuery.includes('farg') ||
                lowerQuery.includes('hair') ||
                lowerQuery.includes('barber') ||
                lowerQuery.includes('skägg') ||
                lowerQuery.includes('skegg') ||
                lowerQuery.includes('shave') ||
                lowerQuery.includes('rakning') ||
                lowerQuery.includes('fade')
            ) {
                queryTerms.push('hair', 'hår', 'frisör', 'klippning', 'färgning', 'klipp', 'slingor', 'balayage', 'barber', 'skägg', 'shave', 'barberare');
            }

            // Smart synonym matching: Massage/Spa/Avslappning/Massasje/Hieronta/Nudd
            if (
                lowerQuery.includes('massage') || 
                lowerQuery.includes('spa') || 
                lowerQuery.includes('avslapp') ||
                lowerQuery.includes('massasje') ||
                lowerQuery.includes('hieronta') ||
                lowerQuery.includes('nudd')
            ) {
                queryTerms.push('massage', 'spa', 'avslappning', 'massasje', 'hieronta', 'nudd');
            }

            // Smart synonym matching: Facial/Ansikte/Hudvård/Skincare/Peeling/Dermapen/Microneedling/Iho/Húð
            if (
                lowerQuery.includes('ansikte') ||
                lowerQuery.includes('hud') ||
                lowerQuery.includes('hudvård') ||
                lowerQuery.includes('hudvard') ||
                lowerQuery.includes('facial') ||
                lowerQuery.includes('skincare') ||
                lowerQuery.includes('peeling') ||
                lowerQuery.includes('dermapen') ||
                lowerQuery.includes('microneedle') ||
                lowerQuery.includes('iho') ||
                lowerQuery.includes('húð') ||
                lowerQuery.includes('hud')
            ) {
                queryTerms.push('ansikte', 'hud', 'hudvård', 'facial', 'skincare', 'peeling', 'dermapen', 'microneedling', 'ansiktsbehandling', 'skin');
            }

            // Smart synonym matching: Makeup/Smink/Sminkning/Meikki/Förðun
            if (
                lowerQuery.includes('smink') ||
                lowerQuery.includes('makeup') ||
                lowerQuery.includes('sminkning') ||
                lowerQuery.includes('meikki') ||
                lowerQuery.includes('förðun') ||
                lowerQuery.includes('fordun') ||
                lowerQuery.includes('pmu')
            ) {
                queryTerms.push('smink', 'makeup', 'sminkning', 'meikki', 'förðun', 'permanent makeup', 'pmu');
            }

            // Smart synonym matching: Waxing/Vaxning/Voksing/Sugaring
            if (
                lowerQuery.includes('vaxning') ||
                lowerQuery.includes('vax') ||
                lowerQuery.includes('waxing') ||
                lowerQuery.includes('voksing') ||
                lowerQuery.includes('sugaring')
            ) {
                queryTerms.push('vaxning', 'vax', 'waxing', 'voksing', 'sugaring');
            }

            // Smart synonym matching: Tattoo/Tatuering/Tatovering/Tatuointi/Húðflúr/Gaddning
            if (
                lowerQuery.includes('tatuering') ||
                lowerQuery.includes('tattoo') ||
                lowerQuery.includes('gaddning') ||
                lowerQuery.includes('tatovering') ||
                lowerQuery.includes('tatuointi') ||
                lowerQuery.includes('húðflúr') ||
                lowerQuery.includes('hudflur')
            ) {
                queryTerms.push('tatuering', 'tattoo', 'gaddning', 'tatovering', 'tatuointi');
            }

            // Smart synonym matching: Piercing/Pierca
            if (
                lowerQuery.includes('piercing') ||
                lowerQuery.includes('pierca')
            ) {
                queryTerms.push('piercing', 'pierca');
            }

            // Smart synonym matching: Foot care/Fotvård/Fotpleie/Fodpleie/Jalkahoito/Fótsnyrting/Pedikyr/Pedicure
            if (
                lowerQuery.includes('fotvård') ||
                lowerQuery.includes('fotvard') ||
                lowerQuery.includes('fotpleie') ||
                lowerQuery.includes('fodpleie') ||
                lowerQuery.includes('jalkahoito') ||
                lowerQuery.includes('fótsnyrting') ||
                lowerQuery.includes('fotsnyrting') ||
                lowerQuery.includes('foot care') ||
                lowerQuery.includes('footcare') ||
                lowerQuery.includes('pedikyr') ||
                lowerQuery.includes('pedicure')
            ) {
                queryTerms.push('fotvård', 'fotpleie', 'fodpleie', 'foot care', 'pedikyr', 'pedicure', 'medical pedicure');
            }

            const orConditions: Prisma.SalonWhereInput[] = [];

            // Add text matching (case-insensitive) for each synonym term
            queryTerms.forEach(term => {
                orConditions.push(
                    { name: { contains: term, mode: 'insensitive' as const } },
                    { description: { contains: term, mode: 'insensitive' as const } },
                    { city: { contains: term, mode: 'insensitive' as const } },
                    { municipality: { contains: term, mode: 'insensitive' as const } }
                );
            });

            // Match in JSON categories
            queryTerms.forEach(term => {
                orConditions.push(
                    { category: { path: [], string_contains: term } },
                    { categories: { path: [], string_contains: term } }
                );
            });

            // Match inside services (any service name containing any query terms, or matching category)
            orConditions.push({
                services: {
                    some: {
                        OR: [
                            ...queryTerms.map(term => ({ name: { contains: term, mode: 'insensitive' as const } })),
                            ...queryTerms.map(term => ({ category: { contains: term, mode: 'insensitive' as const } }))
                        ]
                    }
                }
            });

            // Match inside practitioners (any practitioner title/name containing query terms, or having matching categories)
            orConditions.push({
                practitioners: {
                    some: {
                        OR: [
                            ...queryTerms.map(term => ({ name: { contains: term, mode: 'insensitive' as const } })),
                            ...queryTerms.map(term => ({ title: { contains: term, mode: 'insensitive' as const } })),
                            ...queryTerms.map(term => ({ categories: { path: [], string_contains: term } }))
                        ]
                    }
                }
            });

            (where.AND as any[]).push({
                OR: orConditions
            });
        }

        // 2. Handle Municipality/City/Location (Case-Insensitive)
        const ignoredLocations = ['Hela Sverige', 'Alla städer', 'Sverige'];
        if (municipality && !ignoredLocations.includes(municipality)) {
            (where.AND as any[]).push({
                OR: [
                    { city: { contains: municipality, mode: 'insensitive' as const } },
                    { municipality: { contains: municipality, mode: 'insensitive' as const } }
                ]
            });
        }

        // 3. Handle Category (Salon category OR Service category)
        if (category && category !== 'Alla' && category !== 'Nya') {
            (where.AND as any[]).push({
                OR: [
                    { category: { path: [], string_contains: category } },
                    { categories: { path: [], string_contains: category } },
                    { services: { some: { category: { equals: category } } } }
                ]
            });
        }

        const salons = await prisma.salon.findMany({
            where,
            take: 100,
            include: {
                services: {
                    select: {
                        name: true,
                        price: true,
                        sale_price: true,
                        sale_ends_at: true,
                        category: true
                    }
                }
            }
        });

        const processedData = salons.map(salon => {
            const minPrice = (salon.services || []).length > 0
                ? Math.min(...(salon.services || []).map((s: any) => {
                    const price = Number(s.price);
                    const salePrice = s.sale_price ? Number(s.sale_price) : Infinity;
                    // Check if sale is active
                    const isSaleActive = s.sale_price && (!s.sale_ends_at || new Date(s.sale_ends_at) > new Date());
                    return isSaleActive ? Math.min(price, salePrice) : price;
                }))
                : 399;

            return {
                ...salon,
                joined: salon.created_at,
                priceFrom: (salon.services || []).length > 0 ? minPrice : null,
                profileImage: salon.logo_url,
                backgroundImage: salon.banner_url,
                tier: (salon.membership_tier || 'bas').toLowerCase(),
            };
        });

        // Smart recommended sorting: Tier (LUXE > PRO > BAS) -> Rating (high to low) -> Review Count (high to low) -> Name (alphabetical)
        const tierOrder: Record<string, number> = { 'luxe': 3, 'pro': 2, 'bas': 1 };
        processedData.sort((a, b) => {
            const tierA = tierOrder[a.tier] || 0;
            const tierB = tierOrder[b.tier] || 0;
            if (tierA !== tierB) return tierB - tierA;

            const ratingA = Number(a.rating) || 0;
            const ratingB = Number(b.rating) || 0;
            if (ratingA !== ratingB) return ratingB - ratingA;

            const revA = Number(a.review_count) || 0;
            const revB = Number(b.review_count) || 0;
            if (revA !== revB) return revB - revA;

            return (a.name || '').localeCompare(b.name || '');
        });

        return NextResponse.json({
            success: true,
            salons: processedData
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
            }
        });

    } catch (error) {
        console.error('Salons list error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
