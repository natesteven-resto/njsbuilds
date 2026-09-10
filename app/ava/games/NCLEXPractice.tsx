'use client'

import { useMemo, useState } from 'react'
import { bySubjectAndChapters, shuffle, shuffleOptions, SUBJECTS, type ShuffledQuestion, type SubjectId } from '../lib'

const COLOR_MAP = {
  patho: {
    border: 'border-violet-500/40',
    borderHover: 'hover:border-violet-400',
    bg: 'bg-violet-600/20',
    text: 'text-violet-300',
    tabActive: 'border-violet-400 bg-violet-500/20 text-white',
    btn: 'bg-violet-600 hover:bg-violet-500',
    progress: 'bg-violet-400',
    streak: 'bg-violet-500/20 text-violet-300',
  },
  'health-assessment': {
    border: 'border-teal-500/40',
    borderHover: 'hover:border-teal-400',
    bg: 'bg-teal-600/20',
    text: 'text-teal-300',
    tabActive: 'border-teal-400 bg-teal-500/20 text-white',
    btn: 'bg-teal-600 hover:bg-teal-500',
    progress: 'bg-teal-400',
    streak: 'bg-teal-500/20 text-teal-300',
  },
  foundations: {
    border: 'border-amber-500/40',
    borderHover: 'hover:border-amber-400',
    bg: 'bg-amber-600/20',
    text: 'text-amber-300',
    tabActive: 'border-amber-400 bg-amber-500/20 text-white',
    btn: 'bg-amber-600 hover:bg-amber-500',
    progress: 'bg-amber-400',
    streak: 'bg-amber-500/20 text-amber-300',
  },
  math: {
    border: 'border-rose-500/40',
    borderHover: 'hover:border-rose-400',
    bg: 'bg-rose-600/20',
    text: 'text-rose-300',
    tabActive: 'border-rose-400 bg-rose-500/20 text-white',
    btn: 'bg-rose-600 hover:bg-rose-500',
    progress: 'bg-rose-400',
    streak: 'bg-rose-500/20 text-rose-300',
  },
} as const

interface NCLEXPracticeProps {
  subject: SubjectId
  chapters: number[]
}

export default function NCLEXPractice({ subject, chapters }: NCLEXPracticeProps) {
  const colors = COLOR_MAP[subject]
  const subjectData = SUBJECTS[subject]

  const [seed, setSeed] = useState(0)

  // Filter to SATA, priority, and all MC (NCLEX-style questions)
  const deck = useMemo<ShuffledQuestion[]>(() => {
    const all = bySubjectAndChapters(subject, chapters)
    // Include all SATA + priority, plus all MC (close distractors are standard MC)
    const filtered = all.filter(q => q.type === 'sata' || q.type === 'priority' || q.type === 'mc')
    return shuffle(filtered).map(shuffleOptions)
  }, [subject, chapters, seed])

  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)        // MC/priority
  const [sataSelected, setSataSelected] = useState<Set<number>>(new Set()) // SATA
  const [sataSubmitted, setSataSubmitted] = useState(false)

  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [done, setDone] = useState(false)

  if (!deck.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-slate-400">No questions available for this selection.</p>
        <p className="mt-2 text-xs text-slate-500">Try selecting more chapters or a different subject.</p>
      </div>
    )
  }

  if (done) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className={`rounded-3xl border ${colors.border} ${colors.bg} p-8`}>
          <p className="text-sm uppercase tracking-widest text-slate-300">Session Complete</p>
          <p className="mt-1 text-xs text-slate-400">{subjectData.name}</p>
          <p className="mt-4 text-6xl font-black text-white">{pct}%</p>
          <p className="mt-1 text-slate-300">{correct} / {total} correct</p>
          {streak >= 3 && (
            <p className="mt-2 text-sm text-orange-300">🔥 Best streak: {streak} in a row!</p>
          )}
        </div>
        <button
          onClick={() => {
            setIdx(0); setRevealed(false); setSelected(null)
            setSataSelected(new Set()); setSataSubmitted(false)
            setCorrect(0); setTotal(0); setStreak(0); setDone(false)
            setSeed(s => s + 1)
          }}
          className={`mt-6 w-full rounded-xl ${colors.btn} py-3 font-bold text-white transition`}
        >
          Try Again →
        </button>
      </div>
    )
  }

  const q = deck[idx]
  const isSata = q.type === 'sata'
  const isPriority = q.type === 'priority'
  const isMC = q.type === 'mc'

  function handleMCSelect(optIdx: number) {
    if (revealed) return
    setSelected(optIdx)
    const isCorrect = optIdx === q.shuffledAnswer
    setTotal(t => t + 1)
    if (isCorrect) {
      setCorrect(c => c + 1)
      setStreak(s => s + 1)
    } else {
      setStreak(0)
    }
    setRevealed(true)
  }

  function handleSataSubmit() {
    if (sataSubmitted) return
    setSataSubmitted(true)
    const correct_set = new Set(q.shuffledAnswers ?? [])
    const isCorrect = sataSelected.size === correct_set.size &&
      [...sataSelected].every(v => correct_set.has(v))
    setTotal(t => t + 1)
    if (isCorrect) {
      setCorrect(c => c + 1)
      setStreak(s => s + 1)
    } else {
      setStreak(0)
    }
    setRevealed(true)
  }

  function toggleSataOption(optIdx: number) {
    if (sataSubmitted) return
    setSataSelected(prev => {
      const next = new Set(prev)
      if (next.has(optIdx)) next.delete(optIdx)
      else next.add(optIdx)
      return next
    })
  }

  function next() {
    if (idx >= deck.length - 1) {
      setDone(true)
      return
    }
    setIdx(i => i + 1)
    setRevealed(false)
    setSelected(null)
    setSataSelected(new Set())
    setSataSubmitted(false)
  }

  // Type badge
  const typeBadge = isSata
    ? <span className="inline-block rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">SATA</span>
    : isPriority
    ? <span className="inline-block rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-300">PRIORITY</span>
    : <span className="inline-block rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">MC</span>

  // Current question correctness for revealed state
  const currentCorrect = revealed && (isSata
    ? (() => {
        const cs = new Set(q.shuffledAnswers ?? [])
        return sataSelected.size === cs.size && [...sataSelected].every(v => cs.has(v))
      })()
    : selected === q.shuffledAnswer
  )

  return (
    <div className="mx-auto max-w-2xl">
      {/* Top bar: score + streak */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-bold text-white">{correct}/{total} correct</span>
          {streak >= 3 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors.streak}`}>
              🔥 {streak} streak
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {idx + 1} / {deck.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${colors.progress}`}
          style={{ width: `${((idx + 1) / deck.length) * 100}%` }}
        />
      </div>

      <div className={`rounded-2xl border ${colors.border} bg-slate-800/60 p-6`}>
        {/* Question header */}
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
            Ch {q.chapter}
          </span>
          {typeBadge}
        </div>

        {isSata && (
          <p className="mb-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
            Select all that apply
          </p>
        )}

        <p className="mb-5 text-lg font-semibold leading-relaxed text-white">{q.question}</p>

        {/* Options */}
        {isSata ? (
          <div className="space-y-2.5">
            {q.shuffledOptions.map((opt, optIdx) => {
              const checked = sataSelected.has(optIdx)
              const isCorrectOpt = (q.shuffledAnswers ?? []).includes(optIdx)
              let cls = 'border-white/10 bg-white/5 text-slate-200'
              if (revealed) {
                if (isCorrectOpt && checked) cls = 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                else if (isCorrectOpt && !checked) cls = 'border-amber-400 bg-amber-500/10 text-amber-200'
                else if (!isCorrectOpt && checked) cls = 'border-red-500 bg-red-500/15 text-red-200'
                else cls = 'border-white/10 bg-white/5 text-slate-500'
              } else if (checked) {
                cls = 'border-blue-400 bg-blue-500/15 text-blue-100'
              }
              return (
                <label
                  key={optIdx}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${cls} ${revealed ? 'cursor-default' : 'hover:border-blue-400/50'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={revealed}
                    onChange={() => toggleSataOption(optIdx)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-400"
                  />
                  <span className="flex-1">{opt}</span>
                  {revealed && isCorrectOpt && !checked && (
                    <span className="text-[10px] font-semibold text-amber-300 shrink-0">missed</span>
                  )}
                </label>
              )
            })}

            {!revealed && (
              <button
                onClick={handleSataSubmit}
                disabled={sataSelected.size === 0}
                className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-40"
              >
                Submit Answer
              </button>
            )}

            {revealed && (
              <p className="mt-1 text-xs text-slate-500">
                {(() => {
                  const cs = new Set(q.shuffledAnswers ?? [])
                  const hits = [...sataSelected].filter(v => cs.has(v)).length
                  return `You selected ${hits}/${cs.size} correct answers`
                })()}
              </p>
            )}
          </div>
        ) : (
          /* MC / Priority */
          <div className="space-y-2.5">
            {q.shuffledOptions.map((opt, optIdx) => {
              const isAnswer = optIdx === q.shuffledAnswer
              const isChosen = selected === optIdx
              let cls = 'border-white/10 bg-white/5 text-slate-200 hover:border-violet-400/50'
              if (revealed) {
                if (isAnswer) cls = 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                else if (isChosen) cls = 'border-red-500 bg-red-500/15 text-red-200'
                else cls = 'border-white/10 bg-white/5 text-slate-500'
              }
              return (
                <button
                  key={optIdx}
                  disabled={revealed}
                  onClick={() => handleMCSelect(optIdx)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${cls}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        )}

        {/* Explanation after reveal */}
        {revealed && (
          <div className={`mt-5 rounded-xl p-4 ${currentCorrect ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider">
              {currentCorrect
                ? <span className="text-emerald-300">✓ Correct</span>
                : <span className="text-red-300">✗ Not quite</span>
              }
            </p>
            <p className="text-sm leading-relaxed text-slate-200">{q.explanation}</p>
          </div>
        )}
      </div>

      {/* Next button */}
      {revealed && (
        <button
          onClick={next}
          className={`mt-4 w-full rounded-xl ${colors.btn} py-3 font-bold text-white transition`}
        >
          {idx >= deck.length - 1 ? 'See Results →' : 'Next Question →'}
        </button>
      )}
    </div>
  )
}
