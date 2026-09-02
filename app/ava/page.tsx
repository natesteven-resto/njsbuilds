'use client'

import { useState } from 'react'
import Tutor from './Tutor'
import MockTest from './MockTest'
import Flashcards from './games/Flashcards'
import Matching from './games/Matching'
import TimedQuiz from './games/TimedQuiz'
import CaseScenarios from './games/CaseScenarios'
import { CHAPTER_NAMES } from './lib'

type View = 'home' | 'games' | 'test'
type Game = 'flashcards' | 'matching' | 'timed' | 'cases' | null

export default function AvaPage() {
  const [view, setView] = useState<View>('home')
  const [game, setGame] = useState<Game>(null)
  const [chapters, setChapters] = useState<number[]>([1, 2, 3, 4, 5])

  function toggleChapter(c: number) {
    setChapters((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c].sort()))
  }

  const contextHint =
    view === 'test' ? 'taking a mock test'
    : game ? `playing ${game} on chapters ${chapters.join(', ')}`
    : undefined

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_55%)]" />
      <div className="relative mx-auto max-w-4xl px-5 py-10">
        {/* Header */}
        <header className="mb-8 text-center">
          <button onClick={() => { setView('home'); setGame(null) }} className="inline-block">
            <h1 className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
              Ava&apos;s Secret Study Tool
            </h1>
          </button>
          <p className="mt-2 text-sm text-slate-400">Pathophysiology · Fort Hays State University</p>
        </header>

        {/* HOME */}
        {view === 'home' && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <button
                onClick={() => { setView('games'); setGame(null) }}
                className="group rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 to-slate-900 p-8 text-left transition hover:border-violet-400 hover:shadow-xl hover:shadow-violet-500/10"
              >
                <div className="mb-4 text-4xl">🎮</div>
                <h2 className="text-xl font-bold text-white">Study Games</h2>
                <p className="mt-1.5 text-sm text-slate-400">Flashcards, matching, beat-the-clock quiz, and clinical case scenarios. Learn by doing.</p>
                <span className="mt-4 inline-block text-sm font-semibold text-violet-300 transition group-hover:translate-x-1">Play →</span>
              </button>

              <button
                onClick={() => setView('test')}
                className="group rounded-3xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-600/20 to-slate-900 p-8 text-left transition hover:border-fuchsia-400 hover:shadow-xl hover:shadow-fuchsia-500/10"
              >
                <div className="mb-4 text-4xl">📝</div>
                <h2 className="text-xl font-bold text-white">Mock Test</h2>
                <p className="mt-1.5 text-sm text-slate-400">80-minute timed exam. Multiple choice + true/false. Randomized every retake, with explanations on every miss.</p>
                <span className="mt-4 inline-block text-sm font-semibold text-fuchsia-300 transition group-hover:translate-x-1">Start test →</span>
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <p className="text-sm text-slate-300">💬 Stuck on something? Tap the chat button anytime — your tutor is always on.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">Covered chapters</p>
              <div className="grid gap-1.5 text-sm text-slate-400 sm:grid-cols-2">
                {[1, 2, 3, 4, 5].map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300">{c}</span>
                    {CHAPTER_NAMES[c]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* GAMES */}
        {view === 'games' && (
          <div>
            {/* Chapter filter */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Focus chapters</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleChapter(c)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      chapters.includes(c) ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-white/10 text-slate-400'
                    }`}
                  >
                    Ch {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Game picker */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([
                ['flashcards', '🃏', 'Flashcards'],
                ['matching', '🔗', 'Matching'],
                ['timed', '⏱️', 'Beat the Clock'],
                ['cases', '🩺', 'Case Scenarios'],
              ] as const).map(([key, icon, label]) => (
                <button
                  key={key}
                  onClick={() => setGame(key)}
                  className={`rounded-2xl border p-4 text-center transition ${
                    game === key ? 'border-violet-400 bg-violet-500/20' : 'border-white/10 bg-white/5 hover:border-violet-400/50'
                  }`}
                >
                  <div className="text-2xl">{icon}</div>
                  <div className="mt-1.5 text-xs font-semibold text-slate-200">{label}</div>
                </button>
              ))}
            </div>

            <div className="min-h-[300px]">
              {!game && <p className="text-center text-slate-500">Pick a game above to start.</p>}
              {game === 'flashcards' && <Flashcards chapters={chapters} />}
              {game === 'matching' && <Matching chapters={chapters} />}
              {game === 'timed' && <TimedQuiz chapters={chapters} />}
              {game === 'cases' && <CaseScenarios chapters={chapters} />}
            </div>

            <button onClick={() => { setView('home'); setGame(null) }} className="mx-auto mt-10 block text-sm text-slate-500 underline hover:text-slate-300">
              ← Back to home
            </button>
          </div>
        )}

        {/* TEST */}
        {view === 'test' && <MockTest onExit={() => setView('home')} />}
      </div>

      <Tutor contextHint={contextHint} />
    </main>
  )
}
