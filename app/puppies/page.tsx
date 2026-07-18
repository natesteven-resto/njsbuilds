'use client'

export default function PuppiesPage() {
  return (
    <div className="min-h-screen bg-[#070809] text-white flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="text-6xl mb-8">🐾</div>
        <h1 className="text-4xl font-black tracking-tight mb-4">Litter Sold Out</h1>
        <p className="text-slate-400 text-lg leading-relaxed mb-6">
          All 7 puppies from our 2026 Silver &amp; Charcoal Lab litter have found their homes.
          Thank you to everyone who reached out.
        </p>
        <p className="text-slate-600 text-sm">
          Questions? Call us at{' '}
          <a href="tel:3166174855" className="text-amber-400 hover:underline">(316) 617-4855</a>
        </p>
      </div>
    </div>
  )
}
