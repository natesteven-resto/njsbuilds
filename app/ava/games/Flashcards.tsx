'use client'

import { useMemo, useState } from 'react'
import { termPairs, shuffle } from '../lib'

export default function Flashcards({ chapters }: { chapters: number[] }) {
  const cards = useMemo(() => shuffle(termPairs(chapters)), [chapters])
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<Set<number>>(new Set())

  if (!cards.length) {
    return <p className="text-center text-slate-400">No flashcards for this selection.</p>
  }

  const card = cards[i]
  const progress = Math.round((known.size / cards.length) * 100)

  function next(mark?: 'known' | 'review') {
    if (mark === 'known') setKnown((k) => new Set(k).add(i))
    if (mark === 'review') setKnown((k) => { const n = new Set(k); n.delete(i); return n })
    setFlipped(false)
    setI((v) => (v + 1) % cards.length)
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
        <span>Card {i + 1} / {cards.length}</span>
        <span>{known.size} mastered ({progress}%)</span>
      </div>
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="group relative mt-4 flex min-h-[220px] w-full items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-center shadow-xl transition hover:border-violet-400/50"
      >
        <span className="absolute right-4 top-3 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">Ch {card.chapter}</span>
        {!flipped ? (
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-violet-400">Term</p>
            <p className="text-2xl font-bold text-white">{card.term}</p>
            <p className="mt-4 text-xs text-slate-500">tap to flip</p>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-fuchsia-400">Definition</p>
            <p className="text-lg leading-relaxed text-slate-100">{card.definition}</p>
          </div>
        )}
      </button>

      <div className="mt-5 flex gap-3">
        <button onClick={() => next('review')} className="flex-1 rounded-xl border border-amber-500/40 bg-amber-500/10 py-3 font-semibold text-amber-300 transition hover:bg-amber-500/20">
          Still learning
        </button>
        <button onClick={() => next('known')} className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-500/20">
          Got it ✓
        </button>
      </div>
    </div>
  )
}
