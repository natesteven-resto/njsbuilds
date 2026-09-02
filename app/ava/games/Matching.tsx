'use client'

import { useMemo, useState } from 'react'
import { termPairs, shuffle } from '../lib'

const ROUND_SIZE = 6

export default function Matching({ chapters }: { chapters: number[] }) {
  const allPairs = useMemo(() => termPairs(chapters), [chapters])
  const [seed, setSeed] = useState(0)

  const round = useMemo(() => shuffle(allPairs).slice(0, ROUND_SIZE), [allPairs, seed])
  const terms = useMemo(() => shuffle(round.map((p, i) => ({ ...p, key: i }))), [round])
  const defs = useMemo(() => shuffle(round.map((p, i) => ({ ...p, key: i }))), [round])

  const [selTerm, setSelTerm] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<number | null>(null)

  if (round.length < 2) {
    return <p className="text-center text-slate-400">Not enough pairs for this selection.</p>
  }

  function pickDef(defKey: number) {
    if (selTerm === null) return
    if (defKey === selTerm) {
      setMatched((m) => new Set(m).add(defKey))
      setSelTerm(null)
    } else {
      setWrong(defKey)
      setTimeout(() => setWrong(null), 500)
    }
  }

  const done = matched.size === round.length

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
        <span>Match all {round.length} pairs</span>
        <span>{matched.size} / {round.length}</span>
      </div>

      {done ? (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <p className="text-2xl font-bold text-emerald-300">Perfect match! 🎉</p>
          <button onClick={() => { setMatched(new Set()); setSelTerm(null); setSeed((s) => s + 1) }} className="mt-5 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white transition hover:bg-emerald-400">
            New round
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {terms.map((t) => (
              <button
                key={t.key}
                disabled={matched.has(t.key)}
                onClick={() => setSelTerm(t.key)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  matched.has(t.key)
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 opacity-50'
                    : selTerm === t.key
                    ? 'border-violet-400 bg-violet-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-violet-400/50'
                }`}
              >
                {t.term}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {defs.map((d) => (
              <button
                key={d.key}
                disabled={matched.has(d.key)}
                onClick={() => pickDef(d.key)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-xs leading-snug transition ${
                  matched.has(d.key)
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 opacity-50'
                    : wrong === d.key
                    ? 'border-red-500 bg-red-500/20 text-red-200'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-fuchsia-400/50'
                }`}
              >
                {d.definition}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
