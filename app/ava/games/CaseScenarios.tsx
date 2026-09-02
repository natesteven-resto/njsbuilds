'use client'

import { useMemo, useState } from 'react'
import { byChapters, shuffle, shuffleOptions, type ShuffledQuestion } from '../lib'

// Case scenarios = application-style questions. We surface questions whose text
// reads like a scenario ("A patient..."), falling back to all MC if few exist.
export default function CaseScenarios({ chapters }: { chapters: number[] }) {
  const [seed, setSeed] = useState(0)
  const deck = useMemo<ShuffledQuestion[]>(() => {
    const all = byChapters(chapters).filter((q) => q.type === 'mc')
    const scenarios = all.filter((q) => /patient|client|presents|admitted|reports|year-old|develops|experiencing|comes in|nurse/i.test(q.question))
    const base = scenarios.length >= 6 ? scenarios : all
    return shuffle(base).map(shuffleOptions)
  }, [chapters, seed])

  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answered, setAnswered] = useState(0)
  const [correct, setCorrect] = useState(0)

  if (!deck.length) return <p className="text-center text-slate-400">No scenarios for this selection.</p>

  const q = deck[i % deck.length]

  function pick(idx: number) {
    if (picked !== null) return
    setPicked(idx)
    setAnswered((a) => a + 1)
    if (idx === q.shuffledAnswer) setCorrect((c) => c + 1)
  }

  function next() {
    setPicked(null)
    setI((v) => v + 1)
    if ((i + 1) % deck.length === 0) setSeed((s) => s + 1)
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
        <span>Clinical case scenario</span>
        <span>{correct}/{answered} correct</span>
      </div>

      <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-slate-800/80 to-fuchsia-950/30 p-6">
        <span className="mb-3 inline-block rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-[10px] text-fuchsia-300">Ch {q.chapter} · Apply it</span>
        <p className="mb-5 text-lg font-medium leading-relaxed text-white">{q.question}</p>
        <div className="space-y-2.5">
          {q.shuffledOptions.map((opt, idx) => {
            const isAnswer = idx === q.shuffledAnswer
            const show = picked !== null
            return (
              <button
                key={idx}
                onClick={() => pick(idx)}
                disabled={picked !== null}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  show && isAnswer
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                    : show && idx === picked
                    ? 'border-red-500 bg-red-500/15 text-red-200'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-fuchsia-400/50'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {picked !== null && (
          <div className="mt-4">
            <div className={`rounded-lg p-3 text-sm leading-relaxed ${picked === q.shuffledAnswer ? 'bg-emerald-500/10 text-emerald-100' : 'bg-white/5 text-slate-200'}`}>
              <span className="font-semibold">{picked === q.shuffledAnswer ? 'Correct! ' : 'Not quite. '}</span>
              {q.explanation}
            </div>
            <button onClick={next} className="mt-3 w-full rounded-xl bg-fuchsia-600 py-3 font-semibold text-white transition hover:bg-fuchsia-500">
              Next case →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
