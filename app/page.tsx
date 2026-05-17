'use client'

import Link from 'next/link'

const projects = [
  {
    href: '/puppies',
    emoji: '🐾',
    title: 'Silver Lab Puppies',
    desc: 'Our final litter — AKC Silver Labradors ready for loving homes.',
  },
  {
    href: '/alana',
    emoji: '🏀',
    title: "Alana's Training",
    desc: 'Basketball workout tracker for Andale Indians freshman.',
  },
  {
    href: '/nathan',
    emoji: '💪',
    title: "Nathan's Workouts",
    desc: 'Personal fitness tracker and workout log.',
  },
  {
    href: '/training',
    emoji: '🐕',
    title: 'Dog Training',
    desc: 'Phase-based training tracker for the new pup.',
  },
  {
    href: '/bc.html',
    emoji: '📋',
    title: 'BC',
    desc: '',
  },
  {
    href: '/reddi.html',
    emoji: '🚛',
    title: 'Reddi',
    desc: '',
  },
]

export default function HomePage() {
  return (
    <div
      className="min-h-screen text-[#F1F3F5]"
      style={{ background: '#07090D', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center"
        style={{ background: '#07090D', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-white font-bold text-lg tracking-tight">
          NJS<span style={{ color: '#FF5F04' }}>Builds</span>
        </span>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center pt-40 pb-20 px-6 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 uppercase tracking-widest"
          style={{ background: 'rgba(255,95,4,0.12)', color: '#FF5F04', border: '1px solid rgba(255,95,4,0.25)' }}
        >
          <span style={{ fontSize: '8px' }}>●</span> NJS Builds
        </div>
        <h1
          className="text-5xl md:text-6xl font-extrabold leading-tight"
          style={{ letterSpacing: '-0.03em' }}
        >
          Things I&apos;ve <span style={{ color: '#FF5F04' }}>Built</span>
        </h1>
        <p className="mt-5 text-lg max-w-md" style={{ color: '#6B7280' }}>
          Apps, projects, and tools by Nate Steven.
        </p>
      </section>

      {/* Projects */}
      <section className="px-6 pb-24 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.filter(p => p.title && p.emoji).map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group rounded-2xl p-6 transition-all hover:scale-[1.02]"
              style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-3xl mb-3">{p.emoji}</div>
              <h3 className="font-semibold text-white mb-1">{p.title}</h3>
              {p.desc && <p className="text-sm" style={{ color: '#6B7280' }}>{p.desc}</p>}
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-8 text-center text-sm"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#6B7280' }}
      >
        © {new Date().getFullYear()} NJS Builds
      </footer>
    </div>
  )
}
