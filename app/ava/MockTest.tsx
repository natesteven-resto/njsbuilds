'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { bySubjectAndChapters, byChapters, shuffle, shuffleOptions, CHAPTER_NAMES, SUBJECTS, type ShuffledQuestion, type SubjectId } from './lib'

const TEST_MINUTES = 80

interface MockTestProps {
  onExit: () => void
  subject?: SubjectId
  chapters?: number[]
}

export default function MockTest({ onExit, subject, chapters }: MockTestProps) {
  // Legacy: if no subject/chapters provided, use patho + all chapters
  const defaultChapters = subject
    ? Object.keys(SUBJECTS[subject].chapters).map(Number)
    : [1, 2, 3, 4, 5]

  const [localChapters, setLocalChapters] = useState<number[]>(chapters ?? defaultChapters)
  const [count, setCount] = useState(60)
  const [started, setStarted] = useState(false)
  const [seed, setSeed] = useState(0)

  const deck = useMemo<ShuffledQuestion[]>(() => {
    const pool = subject
      ? bySubjectAndChapters(subject, localChapters.length ? localChapters : defaultChapters)
      : byChapters(localChapters)
    return shuffle(pool).slice(0, count).map(shuffleOptions)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localChapters, count, seed, started])

  const [answers, setAnswers] = useState<Record<number, number>>({})
  // SATA: per-question-index → set of selected option indices
  const [sataSelections, setSataSelections] = useState<Record<number, Set<number>>>({})
  const [sataSubmitted, setSataSubmitted] = useState<Set<number>>(new Set())

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

  function toggleLocalChapter(c: number) {
    setLocalChapters((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c].sort((a, b) => a - b)))
  }

  function begin() {
    setAnswers({})
    setSataSelections({})
    setSataSubmitted(new Set())
    setCur(0)
    setSubmitted(false)
    setSecondsLeft(TEST_MINUTES * 60)
    setSeed((s) => s + 1)
    setStarted(true)
  }

  // SATA helpers
  function toggleSataOption(qIdx: number, optIdx: number) {
    if (sataSubmitted.has(qIdx)) return
    setSataSelections((prev) => {
      const current = new Set(prev[qIdx] ?? [])
      if (current.has(optIdx)) current.delete(optIdx)
      else current.add(optIdx)
      return { ...prev, [qIdx]: current }
    })
  }

  function submitSata(qIdx: number) {
    setSataSubmitted((prev) => new Set(prev).add(qIdx))
  }

  function isSataCorrect(q: ShuffledQuestion, qIdx: number): boolean {
    const selected = sataSelections[qIdx] ?? new Set()
    const correct = new Set(q.shuffledAnswers ?? [])
    if (selected.size !== correct.size) return false
    for (const v of correct) if (!selected.has(v)) return false
    return true
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  const chapterListForSetup = subject
    ? Object.keys(SUBJECTS[subject].chapters).map(Number)
    : [1, 2, 3, 4, 5]

  // ---------- SETUP ----------
  if (!started) {
    const available = subject
      ? bySubjectAndChapters(subject, localChapters.length ? localChapters : defaultChapters).length
      : byChapters(localChapters).length

    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-1 text-2xl font-bold text-white">Mock Test</h2>
        <p className="mb-6 text-sm text-slate-400">
          {TEST_MINUTES}-minute timed exam · MC, true/false & SATA · fully randomized every retake.
          {subject && <span className="ml-1 text-slate-500">Subject: {SUBJECTS[subject].name}</span>}
        </p>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="mb-3 text-sm font-semibold text-slate-200">Chapters to include</p>
          <div className="flex flex-wrap gap-2">
            {chapterListForSetup.map((c) => (
              <button
                key={c}
                onClick={() => toggleLocalChapter(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  localChapters.includes(c)
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
          <p className="mt-3 text-xs text-slate-500">
            {available} questions available{available < count ? ` — test will use all ${available}.` : ''}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onExit} className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-slate-300 transition hover:bg-white/5">Back</button>
          <button onClick={begin} disabled={!localChapters.length} className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-40">
            Start {TEST_MINUTES}-min test →
          </button>
        </div>
      </div>
    )
  }

  // ---------- RESULTS ----------
  if (submitted) {
    let right = 0
    deck.forEach((q, i) => {
      if (q.type === 'sata') {
        if (isSataCorrect(q, i)) right++
      } else {
        if (answers[i] === (q.shuffledAnswer ?? 0)) right++
      }
    })
    const pct = Math.round((right / deck.length) * 100)
    const wrongList = deck.map((q, i) => ({ q, i })).filter(({ q, i }) => {
      if (q.type === 'sata') return !isSataCorrect(q, i)
      return answers[i] !== (q.shuffledAnswer ?? 0)
    })

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
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                      Ch {q.chapter}{CHAPTER_NAMES[q.chapter] ? ` · ${CHAPTER_NAMES[q.chapter]}` : ''}
                    </span>
                    {q.type === 'sata' && (
                      <span className="inline-block rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">SATA</span>
                    )}
                  </div>
                  <p className="mb-3 font-semibold text-white">{q.question}</p>

                  {q.type === 'sata' ? (
                    <div className="space-y-1.5 mb-3">
                      {q.shuffledOptions.map((opt, idx) => {
                        const wasSelected = (sataSelections[i] ?? new Set()).has(idx)
                        const isCorrect = (q.shuffledAnswers ?? []).includes(idx)
                        let cls = 'border-white/10 text-slate-400'
                        if (isCorrect && wasSelected) cls = 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                        else if (isCorrect && !wasSelected) cls = 'border-amber-400 bg-amber-500/10 text-amber-200'
                        else if (!isCorrect && wasSelected) cls = 'border-red-500 bg-red-500/10 text-red-200'
                        return (
                          <div key={idx} className={`rounded-lg border px-3 py-2 text-xs ${cls}`}>
                            {isCorrect && wasSelected && '✓ '}
                            {isCorrect && !wasSelected && '○ missed: '}
                            {!isCorrect && wasSelected && '✗ '}
                            {opt}
                          </div>
                        )
                      })}
                      <p className="text-xs text-slate-500 mt-1">
                        {(() => {
                          const sel = sataSelections[i] ?? new Set()
                          const correct = new Set(q.shuffledAnswers ?? [])
                          const hits = [...sel].filter(v => correct.has(v)).length
                          return `You selected ${hits}/${correct.size} correct answers`
                        })()}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-red-300">Your answer: {answers[i] != null ? q.shuffledOptions[answers[i]] : '(blank)'}</p>
                      <p className="text-sm text-emerald-300">Correct: {q.shuffledOptions[(q.shuffledAnswer ?? 0)]}</p>
                    </>
                  )}
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
  const answeredCount = Object.keys(answers).length + sataSubmitted.size
  const isSata = q.type === 'sata'
  const currentSataSelected = sataSelections[cur] ?? new Set<number>()
  const currentSataRevealed = sataSubmitted.has(cur)

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
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
            Ch {q.chapter}{CHAPTER_NAMES[q.chapter] ? ` · ${CHAPTER_NAMES[q.chapter]}` : ''}
          </span>
          {q.type === 'sata' && (
            <span className="inline-block rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">SATA</span>
          )}
          {q.type === 'priority' && (
            <span className="inline-block rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-orange-300">PRIORITY</span>
          )}
        </div>

        {isSata && (
          <p className="mb-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">Select all that apply</p>
        )}

        <p className="mb-5 text-lg font-semibold text-white">{q.question}</p>

        {isSata ? (
          /* SATA: checkboxes */
          <div className="space-y-2.5">
            {q.shuffledOptions.map((opt, idx) => {
              const checked = currentSataSelected.has(idx)
              const isCorrect = (q.shuffledAnswers ?? []).includes(idx)

              let cls = 'border-white/10 bg-white/5 text-slate-200'
              if (currentSataRevealed) {
                if (isCorrect && checked) cls = 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                else if (isCorrect && !checked) cls = 'border-amber-400 bg-amber-500/10 text-amber-200'
                else if (!isCorrect && checked) cls = 'border-red-500 bg-red-500/15 text-red-200'
                else cls = 'border-white/10 bg-white/5 text-slate-500'
              } else if (checked) {
                cls = 'border-blue-400 bg-blue-500/15 text-blue-100'
              }

              return (
                <label
                  key={idx}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${cls} ${currentSataRevealed ? 'cursor-default' : 'hover:border-blue-400/50'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={currentSataRevealed}
                    onChange={() => toggleSataOption(cur, idx)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-400"
                  />
                  <span>{opt}</span>
                </label>
              )
            })}

            {!currentSataRevealed ? (
              <button
                onClick={() => submitSata(cur)}
                disabled={currentSataSelected.size === 0}
                className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-40"
              >
                Submit Answer
              </button>
            ) : (
              <div className="mt-2 rounded-lg bg-white/5 p-3 text-sm leading-relaxed text-slate-300">
                <span className={`font-semibold ${isSataCorrect(q, cur) ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {isSataCorrect(q, cur) ? 'Perfect! ' : 'Not quite. '}
                </span>
                {q.explanation}
              </div>
            )}
          </div>
        ) : (
          /* MC / TF / Priority: radio buttons */
          <div className="space-y-2.5">
            {q.shuffledOptions.map((opt, idx) => {
              const chosen = answers[cur] === idx
              const wasAnswered = answers[cur] != null
              const isCorrect = idx === (q.shuffledAnswer ?? 0)
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
                    if (idx !== (q.shuffledAnswer ?? 0)) setReviewWrong(q)
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${cls}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        )}
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

      {/* Wrong-answer popup (MC/TF only) */}
      {reviewWrong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReviewWrong(null)}>
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400">✕</div>
              <p className="font-bold text-white">Not quite</p>
            </div>
            <p className="mb-2 text-sm text-emerald-300">Correct answer: {reviewWrong.shuffledOptions[(reviewWrong.shuffledAnswer ?? 0)]}</p>
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
