import { Metadata } from 'next';
import SalonContent from "../salon/SalonContent";

import { use } from 'react';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    // Capitalize slug for title or fetch from DB in real implementation
    const name = slug.charAt(0).toUpperCase() + slug.slice(1);

    return {
        title: `${name} | Boka tid på Glowbook`,
        description: `Boka din nästa behandling hos ${name} via Glowbook. Enkelt, snyggt och smidigt.`,
        openGraph: {
            title: `${name} | Glowbook`,
            description: `Upptäck och boka ${name} på Glowbook.`,
            type: 'website',
        }
    };
}

export default function ShortLinkPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    return <SalonContent params={{ id: slug }} />;
}
