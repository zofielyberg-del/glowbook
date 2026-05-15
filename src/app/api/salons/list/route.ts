
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

        // 1. Handle Query (Search text)
        if (query) {
            (where.AND as any[]).push({
                OR: [
                    { name: { contains: query } },
                    { description: { contains: query } },
                    { city: { contains: query } },
                    { municipality: { contains: query } }
                ]
            });
        }

        // 2. Handle Municipality/City/Location
        const ignoredLocations = ['Hela Sverige', 'Alla städer', 'Sverige'];
        if (municipality && !ignoredLocations.includes(municipality)) {
            (where.AND as any[]).push({
                OR: [
                    { city: { contains: municipality } },
                    { municipality: { contains: municipality } }
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
