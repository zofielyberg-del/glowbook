
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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

            // Smart synonym matching: Nagel/Naglar/Nails/Manikyr/Pedikyr/Gellack/Akryl/Gelé
            if (
                lowerQuery.includes('nagel') || 
                lowerQuery.includes('naglar') || 
                lowerQuery.includes('nails') || 
                lowerQuery.includes('manikyr') || 
                lowerQuery.includes('pedikyr') || 
                lowerQuery.includes('gellack') || 
                lowerQuery.includes('akryl') || 
                lowerQuery.includes('gelé') ||
                lowerQuery.includes('gele')
            ) {
                queryTerms.push('nails', 'naglar', 'manikyr', 'pedikyr', 'gellack', 'akryl', 'gelé', 'gele', 'nagel');
            }

            // Smart synonym matching: Fransar/Bryn/Lashes/Brows/Lashlift/Browlift
            if (
                lowerQuery.includes('frans') || 
                lowerQuery.includes('bryn') || 
                lowerQuery.includes('lash') || 
                lowerQuery.includes('brow') || 
                lowerQuery.includes('lift')
            ) {
                queryTerms.push('lashes', 'fransar', 'bryn', 'brows', 'lashlift', 'browlift');
            }

            // Smart synonym matching: Hår/Frisör/Klipp/Färg/Hair/Balayage
            if (
                lowerQuery.includes('hår') || 
                lowerQuery.includes('har') ||
                lowerQuery.includes('frisör') || 
                lowerQuery.includes('frisor') ||
                lowerQuery.includes('klipp') || 
                lowerQuery.includes('färg') || 
                lowerQuery.includes('farg') ||
                lowerQuery.includes('hair')
            ) {
                queryTerms.push('hair', 'hår', 'frisör', 'klippning', 'färgning', 'klipp', 'slingor', 'balayage');
            }

            // Smart synonym matching: Massage/Spa/Avslappning
            if (
                lowerQuery.includes('massage') || 
                lowerQuery.includes('spa') || 
                lowerQuery.includes('avslapp')
            ) {
                queryTerms.push('massage', 'spa', 'avslappning');
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
            },
            orderBy: {
                created_at: 'desc'
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

        return NextResponse.json({
            success: true,
            salons: processedData
        });

    } catch (error) {
        console.error('Salons list error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
