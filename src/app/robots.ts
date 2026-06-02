import type { MetadataRoute } from 'next'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://domaindrop.watch'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Authenticated and machine endpoints shouldn't be crawled.
      disallow: ['/dashboard', '/api/', '/auth/'],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
