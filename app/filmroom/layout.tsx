import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Film Room — NJS Builds',
  description: 'Basketball film study platform for coaches.',
}

export default function FilmRoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d0f12] text-white font-sans">
      {children}
    </div>
  )
}
