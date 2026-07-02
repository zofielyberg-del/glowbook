import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[Migration] Starting salon images migration...');
        const salons = await prisma.salon.findMany();
        let migratedCount = 0;
        let skippedCount = 0;

        for (const salon of salons) {
            let updated = false;
            let logoUrl = salon.logo_url;
            let bannerUrl = salon.banner_url;
            let galleryImages = salon.gallery_images as any[];

            // 1. Migrate Logo
            if (logoUrl && logoUrl.startsWith('data:image')) {
                console.log(`[Migration] Salon ${salon.name} has Base64 logo. Migrating...`);
                const matches = logoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const mimeType = matches[1];
                    const extension = mimeType.split('/')[1] || 'jpg';
                    const buffer = Buffer.from(matches[2], 'base64');
                    const blob = await put(`salon-${salon.id}-logo.${extension}`, buffer, {
                        contentType: mimeType,
                        access: 'public'
                    });
                    logoUrl = blob.url;
                    updated = true;
                    console.log(`[Migration] Logo migrated to Vercel Blob: ${blob.url}`);
                }
            }

            // 2. Migrate Banner
            if (bannerUrl && bannerUrl.startsWith('data:image')) {
                console.log(`[Migration] Salon ${salon.name} has Base64 banner. Migrating...`);
                const matches = bannerUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const mimeType = matches[1];
                    const extension = mimeType.split('/')[1] || 'jpg';
                    const buffer = Buffer.from(matches[2], 'base64');
                    const blob = await put(`salon-${salon.id}-banner.${extension}`, buffer, {
                        contentType: mimeType,
                        access: 'public'
                    });
                    bannerUrl = blob.url;
                    updated = true;
                    console.log(`[Migration] Banner migrated to Vercel Blob: ${blob.url}`);
                }
            }

            // 3. Migrate Gallery Images
            let newGallery: string[] = [];
            let galleryUpdated = false;
            if (Array.isArray(galleryImages)) {
                for (let i = 0; i < galleryImages.length; i++) {
                    const img = galleryImages[i];
                    if (img && img.startsWith('data:image')) {
                        console.log(`[Migration] Salon ${salon.name} gallery image ${i + 1} is Base64. Migrating...`);
                        const matches = img.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                        if (matches && matches.length === 3) {
                            const mimeType = matches[1];
                            const extension = mimeType.split('/')[1] || 'jpg';
                            const buffer = Buffer.from(matches[2], 'base64');
                            const blob = await put(`salon-${salon.id}-gallery-${i}-${Date.now()}.${extension}`, buffer, {
                                contentType: mimeType,
                                access: 'public'
                            });
                            newGallery.push(blob.url);
                            galleryUpdated = true;
                            updated = true;
                            console.log(`[Migration] Gallery image ${i + 1} migrated: ${blob.url}`);
                        } else {
                            newGallery.push(img);
                        }
                    } else {
                        newGallery.push(img);
                    }
                }
            }

            if (updated) {
                await prisma.salon.update({
                    where: { id: salon.id },
                    data: {
                        logo_url: logoUrl,
                        banner_url: bannerUrl,
                        gallery_images: galleryUpdated ? newGallery : undefined
                    }
                });
                migratedCount++;
                console.log(`[Migration] Successfully updated salon database record for ${salon.name}`);
            } else {
                skippedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            migratedSalons: migratedCount,
            skippedSalons: skippedCount
        });
    } catch (error: any) {
        console.error('[Migration Error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
