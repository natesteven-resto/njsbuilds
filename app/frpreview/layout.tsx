import type { Metadata } from 'next'
import { Barlow_Condensed } from 'next/font/google'
import '@/app/filmroom/filmroom.css'

export const metadata: Metadata = { title: 'Film Room — design preview', robots: { index: false, follow: false } }

const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-bc', display: 'swap' })

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`filmroom-shell min-h-screen bg-[#181917] text-[#eee9df] font-sans ${barlowCondensed.variable}`}>
      {children}
    </div>
  )
}
