"use server"
import { getDictionary, Lang } from '@workspace/i8n'
import type { MetadataRoute } from 'next'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const lang = "en-US" // Default language or fetch from context
  const dict = await getDictionary(lang as Lang)
  return {
    name: dict.metadata.title,
    short_name: dict.metadata.title,
    description: dict.metadata.description,
    start_url: `/`,
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#fafafa',
    icons: [
      { src: '/icon192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  }
}
