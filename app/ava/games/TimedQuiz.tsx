'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { byChapters, shuffle, shuffleOptions, type ShuffledQuestion } from '../lib'

const ROUND_SECONDS = 60

export default function TimedQuiz({ chapters }: { chapters: number[] }) {
  const pool = useMemo(() => byChapters(chapters).filter((q) => q.type === 'mc'), [chapters])
  const [seed, setSeed] = useState(0)
  const deck = useMemo<ShuffledQuestion[]>(
    () => shuffle(pool).map(shuffleOptions),
    [pool, seed]
  )

  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [time, setTime] = useState(ROUND_SECONDS)
  const [running, setRunning] = useState(true)
  const [picked, setPicked] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!running) return
    timer.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          setRunning(false)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [running])

  if (!deck.length) return <p className="text-center text-slate-400">No questions for this selection.</p>

  const q = deck[i % deck.length]

  function pick(idx: number) {
    if (picked !== null || !running) return
    setPicked(idx)
    const correct = idx === q.shuffledAnswer
    if (correct) {
      const pts = 10 + streak * 2
      setScore((s) => s + pts)
      setStreak((s) => { const ns = s + 1; setBest((b) => Math.max(b, ns)); return ns })
    } else {
      setStreak(0)
    }
    setTimeout(() => {
      setPicked(null)
      setI((v) => v + 1)
    }, correct ? 450 : 1400)
  }

  function restart() {
    setI(0); setScore(0); setStreak(0); setBest(0); setTime(ROUND_SECONDS); setPicked(null); setSeed((s) => s + 1); setRunning(true)
  }

  if (!running && time === 0) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-violet-500/30 bg-violet-500/10 p-8 text-center">
        <p className="text-sm uppercase tracking-widest text-violet-300">Time!</p>
        <p className="mt-2 text-5xl font-black text-white">{score}</p>
        <p className="mt-1 text-slate-300">points · best streak {best}</p>
        <button onClick={restart} className="mt-6 rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">
          Play again
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-bold text-white">{score} pts</span>
          {streak > 1 && <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-300">🔥 {streak}</span>}
        </div>
        <div className={`rounded-full px-3 py-1 font-mono text-sm font-bold ${time <= 10 ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-slate-300'}`}>
          {time}s
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-6">
        <span className="mb-3 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">Ch {q.chapter}</span>
        <p className="mb-5 text-lg font-semibold text-white">{q.question}</p>
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
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-violet-400/50'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
        {picked !== null && picked !== q.shuffledAnswer && (
          <p className="mt-4 rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-slate-300">
            <span className="font-semibold text-emerald-300">Why: </span>{q.explanation}
          </p>
        )}
      </div>
    </div>
  )
}
