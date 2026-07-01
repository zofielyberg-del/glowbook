import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        if (!lat || !lng) {
            return NextResponse.json({ error: 'lat och lng krävs' }, { status: 400 });
        }

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=sv`,
            {
                headers: {
                    'User-Agent': 'Glowbook-App/1.0 (kontakt@glowbook.se)'
                }
            }
        );

        if (!response.ok) {
            console.error('[Geocoding API] Nominatim failed with status:', response.status);
            return NextResponse.json({ error: 'Kunde inte kontakta karttjänst' }, { status: 502 });
        }

        const data = await response.json();
        const address = data.address || {};
        const detected = address.municipality || address.city || address.town || address.village || address.suburb || address.county;

        return NextResponse.json({
            success: true,
            detected: detected || null,
            address
        });
    } catch (error: any) {
        console.error('[Geocoding API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
