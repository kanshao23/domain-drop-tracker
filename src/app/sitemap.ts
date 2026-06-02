import type { MetadataRoute } from 'next'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://domaindrop.watch'

// Public, crawlable routes only — the dashboard is behind auth.
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/auth/login', '/auth/signup'].map(path => ({
    url: `${appUrl}${path}`,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.5,
  }))
}
