import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://glowbook.se';

  let salons: any[] = [];
  try {
    salons = await prisma.salon.findMany({
      select: {
        slug: true,
        created_at: true
      }
    });
  } catch (err) {
    console.error('Error fetching salons for sitemap:', err);
  }

  const salonUrls = salons.map((salon) => ({
    url: `${baseUrl}/salon/${salon.slug}`,
    lastModified: salon.created_at || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8
  }));

  const staticPages = [
    '',
    '/explore',
    '/giftcards',
    '/rewards',
    '/support',
    '/auth/login',
    '/auth/register',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.6
  }));

  return [...staticPages, ...salonUrls];
}
