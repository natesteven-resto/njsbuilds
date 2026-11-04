import type { Metadata } from 'next'
import { Barlow_Condensed, DM_Sans } from 'next/font/google'
import HuntPrep from './HuntPrep'

const display = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--hunt-display' })
const sans = DM_Sans({ subsets: ['latin'], variable: '--hunt-sans' })

export const metadata: Metadata = {
  title: 'Field & Feather — Pheasant Hunt Prep',
  description: 'Three hunters. Three dogs. One unforgettable adventure. Your personal pheasant-hunt basecamp.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Field & Feather — The good days start here.',
    description: 'A little preparation. A lot of adventure. Your pheasant-hunt field guide.',
    images: [{ url: '/pheasant-prep/hero.webp', width: 1920, height: 1080 }],
  },
}

export default function Page() {
  return <div className={display.variable + ' ' + sans.variable}><HuntPrep /></div>
}
