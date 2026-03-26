import { Locales } from '@workspace/i8n'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const now = new Date()
  const restaurantSlugs = ['restaurant'] // Reemplaza con tus slugs reales

  // Helper para alternates.languages
  const makeAlternates = (path: string) => ({
    languages: Object.fromEntries(
      Locales.map(lang => [
        lang,
        `${base}/${lang}${path === '/' ? '' : path}`,
      ])
    ),
  })

  // Página principal
  const root = {
    url: base,
    lastModified: now,
    alternates: makeAlternates('/'),
    changeFrequency: 'yearly' as const,
    priority: 1,
  }

  // Ejemplo para restaurantes
  const restaurants = restaurantSlugs.map(slug => ({
    url: `${base}/restaurant/${slug}`,
    lastModified: now,
    alternates: makeAlternates(`/restaurant/${slug}`),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  return [
    root,
    ...restaurants,
  ]
}
