'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { byChapters, shuffle, shuffleOptions, CHAPTER_NAMES, type ShuffledQuestion } from './lib'

const TEST_MINUTES = 80

export default function MockTest({ onExit }: { onExit: () => void }) {
  const [chapters, setChapters] = useState<number[]>([1, 2, 3, 4, 5])
  const [count, setCount] = useState(60)
  const [started, setStarted] = useState(false)
  const [seed, setSeed] = useState(0)

  const deck = useMemo<ShuffledQuestion[]>(() => {
    const pool = byChapters(chapters)
    return shuffle(pool).slice(0, count).map(shuffleOptions)
  }, [chapters, count, seed, started])

  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [cur, setCur] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [reviewWrong, setReviewWrong] = useState<ShuffledQuestion | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(TEST_MINUTES * 60)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!started || submitted) return
    timer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { setSubmitted(true); return 0 }
        return s - 1
      })
    }, 1000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [started, submitted])

  function toggleChapter(c: number) {
    setChapters((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c].sort()))
  }

  function begin() {
    setAnswers({}); setCur(0); setSubmitted(false); setSecondsLeft(TEST_MINUTES * 60); setSeed((s) => s + 1); setStarted(true)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  // ---------- SETUP ----------
  if (!started) {
    const available = byChapters(chapters).length
    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-1 text-2xl font-bold text-white">Mock Test</h2>
        <p className="mb-6 text-sm text-slate-400">{TEST_MINUTES}-minute timed exam · multiple choice + true/false · fully randomized every retake.</p>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="mb-3 text-sm font-semibold text-slate-200">Chapters to include</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((c) => (
              <button
                key={c}
                onClick={() => toggleChapter(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  chapters.includes(c)
                    ? 'border-violet-400 bg-violet-500/20 text-white'
                    : 'border-white/10 bg-transparent text-slate-400'
                }`}
              >
                Ch {c}
              </button>
            ))}
          </div>

          <p className="mb-3 mt-6 text-sm font-semibold text-slate-200"># of questions</p>
          <div className="flex flex-wrap gap-2">
            {[50, 60, 75].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                  count === n ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white' : 'border-white/10 text-slate-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">{available} questions available in this selection{available < count ? ` — test will use all ${available}.` : ''}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onExit} className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-slate-300 transition hover:bg-white/5">Back</button>
          <button onClick={begin} disabled={!chapters.length} className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-40">
            Start {TEST_MINUTES}-min test →
          </button>
        </div>
      </div>
    )
  }

  // ---------- RESULTS ----------
  if (submitted) {
    let right = 0
    deck.forEach((q, i) => { if (answers[i] === q.shuffledAnswer) right++ })
    const pct = Math.round((right / deck.length) * 100)
    const wrongList = deck.map((q, i) => ({ q, i })).filter(({ q, i }) => answers[i] !== q.shuffledAnswer)

    return (
      <div className="mx-auto max-w-2xl">
        <div className={`rounded-3xl border p-8 text-center ${pct >= 80 ? 'border-emerald-500/30 bg-emerald-500/10' : pct >= 70 ? 'border-amber-500/30 bg-amber-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
          <p className="text-sm uppercase tracking-widest text-slate-300">Your Score</p>
          <p className="mt-2 text-6xl font-black text-white">{pct}%</p>
          <p className="mt-1 text-slate-300">{right} / {deck.length} correct</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onExit} className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-slate-300 transition hover:bg-white/5">Done</button>
          <button onClick={begin} className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 py-3 font-bold text-white transition hover:opacity-90">
            Retake (fresh questions) →
          </button>
        </div>

        {wrongList.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 text-lg font-bold text-white">Review the ones you missed ({wrongList.length})</h3>
            <div className="space-y-4">
              {wrongList.map(({ q, i }) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                  <span className="mb-2 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">Ch {q.chapter}</span>
                  <p className="mb-3 font-semibold text-white">{q.question}</p>
                  <p className="text-sm text-red-300">Your answer: {answers[i] != null ? q.shuffledOptions[answers[i]] : '(blank)'}</p>
                  <p className="text-sm text-emerald-300">Correct: {q.shuffledOptions[q.shuffledAnswer]}</p>
                  <p className="mt-3 rounded-lg bg-white/5 p-3 text-sm leading-relaxed text-slate-300">{q.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------- TAKING TEST ----------
  const q = deck[cur]
  const answeredCount = Object.keys(answers).length

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">Q {cur + 1} / {deck.length} · {answeredCount} answered</span>
        <div className={`rounded-full px-3 py-1 font-mono text-sm font-bold ${secondsLeft <= 300 ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-slate-300'}`}>
          {mm}:{ss}
        </div>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${((cur + 1) / deck.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-6">
        <span className="mb-3 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">Ch {q.chapter} · {CHAPTER_NAMES[q.chapter]}</span>
        <p className="mb-5 text-lg font-semibold text-white">{q.question}</p>
        <div className="space-y-2.5">
          {q.shuffledOptions.map((opt, idx) => {
            const chosen = answers[cur] === idx
            const wasAnswered = answers[cur] != null
            const isCorrect = idx === q.shuffledAnswer
            let cls = 'border-white/10 bg-white/5 text-slate-200 hover:border-violet-400/50'
            if (wasAnswered) {
              if (isCorrect) cls = 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
              else if (chosen) cls = 'border-red-500 bg-red-500/15 text-red-200'
              else cls = 'border-white/10 bg-white/5 text-slate-500'
            }
            return (
              <button
                key={idx}
                disabled={wasAnswered}
                onClick={() => {
                  setAnswers((a) => ({ ...a, [cur]: idx }))
                  if (idx !== q.shuffledAnswer) setReviewWrong(q)
                }}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${cls}`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition enabled:hover:bg-white/5 disabled:opacity-30">
          ← Prev
        </button>
        {cur < deck.length - 1 ? (
          <button onClick={() => setCur((c) => Math.min(deck.length - 1, c + 1))} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500">
            Next →
          </button>
        ) : (
          <button onClick={() => setSubmitted(true)} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500">
            Submit test
          </button>
        )}
      </div>

      <button onClick={() => { if (confirm('Submit the test now?')) setSubmitted(true) }} className="mx-auto mt-6 block text-xs text-slate-500 underline hover:text-slate-300">
        Finish &amp; grade early
      </button>

      {/* Wrong-answer popup */}
      {reviewWrong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReviewWrong(null)}>
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400">✕</div>
              <p className="font-bold text-white">Not quite</p>
            </div>
            <p className="mb-2 text-sm text-emerald-300">Correct answer: {reviewWrong.shuffledOptions[reviewWrong.shuffledAnswer]}</p>
            <p className="text-sm leading-relaxed text-slate-300">{reviewWrong.explanation}</p>
            <button onClick={() => setReviewWrong(null)} className="mt-5 w-full rounded-xl bg-violet-600 py-2.5 font-semibold text-white transition hover:bg-violet-500">
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
