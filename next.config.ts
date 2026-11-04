import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/winterizations', destination: '/winterizations.html' },
      { source: '/pheasanthunt2026', destination: '/PheasantHunt2026' },
      { source: '/pheasanthunt', destination: '/PheasantHunt2026' },
    ]
  },
  serverExternalPackages: ['@react-pdf/renderer'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'videodelivery.net',
      },
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
  // Note: bodyParser is configured per-route via export const config in Next.js App Router
}

export default nextConfig
