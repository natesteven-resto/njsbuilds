import type { Metadata } from 'next'
import { FilmRoomPageBoundary } from './components/FilmRoomPageBoundary'
import { Barlow_Condensed } from 'next/font/google'

export const metadata: Metadata = {
  title: 'Film Room — Basketball Film Study',
  description: 'Basketball film study platform for coaches.',
}

// Barlow Condensed: real condensed sports heading face, weight 700+900
// Scoped to filmroom layout only — does not affect the rest of the site.
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-bc',
  display: 'swap',
})

export default function FilmRoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`filmroom-shell min-h-screen bg-[#181917] text-[#eee9df] font-sans ${barlowCondensed.variable}`}>
      <FilmRoomPageBoundary />
      {children}
    </div>
  )
}
