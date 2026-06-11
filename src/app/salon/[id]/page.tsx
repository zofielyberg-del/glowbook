
import SalonContent from "../SalonContent";
import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    // Fetch salon information from the database
    const salon = await prisma.salon.findFirst({
        where: {
            OR: [
                { id },
                { slug: id }
            ]
        },
        select: {
            name: true,
            description: true,
            city: true,
            logo_url: true,
            banner_url: true,
            services: {
                select: {
                    name: true
                },
                take: 5
            }
        }
    });

    if (!salon) {
        return {
            title: "Salong ej funnen | Glowbook",
            description: "Hitta och boka skönhetsbehandlingar online på Glowbook."
        };
    }

    const servicesList = (salon.services || []).map(s => s.name).join(", ");
    const pageTitle = `${salon.name} | Boka tid online | Glowbook`;
    const pageDescription = salon.description 
        ? salon.description.substring(0, 155) 
        : `Boka tid online hos ${salon.name} i ${salon.city || 'Sverige'}.${servicesList ? ` Behandlingar: ${servicesList}.` : ''} Se priser och lediga tider.`;

    const shareImage = salon.banner_url || salon.logo_url || "https://glowbook.se/assets/nails_new.jpg";

    return {
        title: pageTitle,
        description: pageDescription,
        openGraph: {
            title: pageTitle,
            description: pageDescription,
            url: `https://glowbook.se/salon/${id}`,
            siteName: "Glowbook",
            images: [
                {
                    url: shareImage,
                    width: 1200,
                    height: 630,
                    alt: salon.name
                }
            ],
            locale: "sv_SE",
            type: "website"
        },
        twitter: {
            card: "summary_large_image",
            title: pageTitle,
            description: pageDescription,
            images: [shareImage]
        }
    };
}

export default async function SalonDynamicPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return (
        <Suspense fallback={null}>
            <SalonContent params={resolvedParams} />
        </Suspense>
    );
}

