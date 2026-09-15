import Link from 'next/link'
import { ArrowUpRight, Film } from 'lucide-react'

/** Shared Film Room welcome screen. Decorative court never intercepts form input. */
export function AuthShell({children}:{children:React.ReactNode}) {
  return <main className="cs min-h-screen bg-[#181917] text-[#eee9df] lg:grid lg:grid-cols-[1.05fr_1fr]">
    <section className="relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10 p-7 sm:p-12 lg:p-16 flex flex-col justify-between min-h-[230px] lg:min-h-screen">
      <Link href="/filmroom" className="relative z-10 flex items-center gap-3 w-fit focus-visible:outline-2 focus-visible:outline-[#c66a3e]"><Film size={23} className="text-[#df8657]"/><span className="font-semibold text-xl tracking-tight">Film Room</span></Link>
      <div className="relative z-10 mt-10 lg:my-24 max-w-lg">
        <p className="text-[11px] uppercase tracking-[.24em] text-[#e79568] mb-5 font-semibold">The work between games</p>
        <h1 className="text-5xl sm:text-6xl xl:text-8xl leading-[.92] uppercase" style={{fontFamily:'var(--font-bc), sans-serif',fontWeight:700}}>See the play.<br/>Teach the game.</h1>
        <p className="mt-6 text-sm sm:text-base text-[#eee9df]/65 max-w-sm leading-relaxed">Your film. Your teaching points. One private place to prepare for what comes next.</p>
      </div>
      <svg aria-hidden="true" viewBox="0 0 600 500" className="absolute w-[650px] max-w-none -right-64 lg:-right-44 -bottom-52 lg:-bottom-32 text-[#c66a3e]/20 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M25 480V25h550v455M210 25v180h180V25M85 25v120a215 215 0 0 0 430 0V25"/><circle cx="300" cy="205" r="90"/><path d="M270 62h60M300 62v18"/><circle cx="300" cy="90" r="12"/><circle cx="300" cy="480" r="75"/></svg>
      <p className="hidden lg:flex relative z-10 items-center gap-2 text-xs uppercase tracking-[.16em] text-[#eee9df]/60">Built for basketball coaches <ArrowUpRight size={15}/></p>
    </section>
    <section className="px-6 py-12 sm:px-12 lg:px-16 flex items-center justify-center"><div className="w-full max-w-[380px]">{children}</div></section>
  </main>
}
