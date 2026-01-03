import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://finlove-one.vercel.app'; // Atualize se tiver domínio próprio

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/'], // Protege áreas privadas e API
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}