import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Barlow } from 'next/font/google'
import './ph.css'

export const metadata: Metadata = {
  title: 'Pheasant Hunt 2026 — The Steven Crew',
  description:
    'Opening weekend command center for Nate, Noah, Nathan and the dogs. Gear, game plan, safety code, bird board.',
  openGraph: {
    title: 'Pheasant Hunt 2026 — The Steven Crew',
    description: 'Three hunters. Three dogs. One opening weekend.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0e0b08',
}

const display = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-ph-display',
  display: 'swap',
})

const body = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ph-body',
  display: 'swap',
})

export default function PheasantHuntLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ph ${display.variable} ${body.variable}`}>
      {children}
    </div>
  )
}
