import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/winterizations', destination: '/winterizations.html' },
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
    ],
  },
  // Note: bodyParser is configured per-route via export const config in Next.js App Router
}

export default nextConfig
