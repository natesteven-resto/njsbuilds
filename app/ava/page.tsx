'use client'

import { useState } from 'react'
import Tutor from './Tutor'
import MockTest from './MockTest'
import Flashcards from './games/Flashcards'
import Matching from './games/Matching'
import TimedQuiz from './games/TimedQuiz'
import CaseScenarios from './games/CaseScenarios'
import NCLEXPractice from './games/NCLEXPractice'
import { SUBJECTS, ALL_QUESTIONS, type SubjectId } from './lib'

type View = 'home' | 'subject' | 'games' | 'nclex' | 'test'
type Game = 'flashcards' | 'matching' | 'timed' | 'cases' | null

// Color maps per subject
const COLOR_MAP = {
  patho: {
    border: 'border-violet-500/40',
    borderHover: 'hover:border-violet-400',
    bg: 'bg-violet-600/20',
    bgGrad: 'from-violet-600/20',
    text: 'text-violet-300',
    textHover: 'hover:text-violet-200',
    pill: 'border-violet-400 bg-violet-500/20',
    shadow: 'hover:shadow-violet-500/10',
    glow: 'bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_55%)]',
    tabActive: 'border-violet-400 bg-violet-500/20 text-white',
    btn: 'bg-violet-600 hover:bg-violet-500',
    btnGrad: 'from-violet-500 to-fuchsia-600',
    progress: 'bg-violet-400',
  },
  'health-assessment': {
    border: 'border-teal-500/40',
    borderHover: 'hover:border-teal-400',
    bg: 'bg-teal-600/20',
    bgGrad: 'from-teal-600/20',
    text: 'text-teal-300',
    textHover: 'hover:text-teal-200',
    pill: 'border-teal-400 bg-teal-500/20',
    shadow: 'hover:shadow-teal-500/10',
    glow: 'bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.15),transparent_55%)]',
    tabActive: 'border-teal-400 bg-teal-500/20 text-white',
    btn: 'bg-teal-600 hover:bg-teal-500',
    btnGrad: 'from-teal-500 to-cyan-600',
    progress: 'bg-teal-400',
  },
  foundations: {
    border: 'border-amber-500/40',
    borderHover: 'hover:border-amber-400',
    bg: 'bg-amber-600/20',
    bgGrad: 'from-amber-600/20',
    text: 'text-amber-300',
    textHover: 'hover:text-amber-200',
    pill: 'border-amber-400 bg-amber-500/20',
    shadow: 'hover:shadow-amber-500/10',
    glow: 'bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.15),transparent_55%)]',
    tabActive: 'border-amber-400 bg-amber-500/20 text-white',
    btn: 'bg-amber-600 hover:bg-amber-500',
    btnGrad: 'from-amber-500 to-orange-600',
    progress: 'bg-amber-400',
  },
  math: {
    border: 'border-rose-500/40',
    borderHover: 'hover:border-rose-400',
    bg: 'bg-rose-600/20',
    bgGrad: 'from-rose-600/20',
    text: 'text-rose-300',
    textHover: 'hover:text-rose-200',
    pill: 'border-rose-400 bg-rose-500/20',
    shadow: 'hover:shadow-rose-500/10',
    glow: 'bg-[radial-gradient(ellipse_at_top,rgba(244,63,94,0.15),transparent_55%)]',
    tabActive: 'border-rose-400 bg-rose-500/20 text-white',
    btn: 'bg-rose-600 hover:bg-rose-500',
    btnGrad: 'from-rose-500 to-pink-600',
    progress: 'bg-rose-400',
  },
} as const

export default function AvaPage() {
  const [view, setView] = useState<View>('home')
  const [subject, setSubject] = useState<SubjectId>('patho')
  const [game, setGame] = useState<Game>(null)
  const [selectedChapters, setSelectedChapters] = useState<number[]>([])  // empty = all

  const subjectData = SUBJECTS[subject]
  const colors = COLOR_MAP[subject]
  const chapterList = Object.keys(subjectData.chapters).map(Number)

  // Active chapters: empty means all
  const activeChapters = selectedChapters.length === 0 ? chapterList : selectedChapters

  function pickSubject(id: SubjectId) {
    setSubject(id)
    setSelectedChapters([])
    setGame(null)
    setView('subject')
  }

  function toggleChapter(c: number) {
    setSelectedChapters((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c].sort((a, b) => a - b)
    )
  }

  function goHome() {
    setView('home')
    setGame(null)
    setSelectedChapters([])
  }

  function goSubject() {
    setView('subject')
    setGame(null)
  }

  const contextHint =
    view === 'test' ? `taking a mock test on ${subjectData.name}`
    : view === 'nclex' ? `doing NCLEX practice for ${subjectData.name}`
    : game ? `playing ${game} for ${subjectData.name}`
    : undefined

  const subjectQCount = ALL_QUESTIONS.filter(q => q.subject === subject).length

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className={`pointer-events-none fixed inset-0 ${colors.glow}`} />
      <div className="relative mx-auto max-w-4xl px-5 py-10">

        {/* Header */}
        <header className="mb-8 text-center">
          {view !== 'home' && (
            <button
              onClick={goHome}
              className="mb-4 flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5"
            >
              ← Home
            </button>
          )}
          <button onClick={goHome} className="inline-block">
            <h1 className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
              Ava&apos;s Study Tool
            </h1>
          </button>
          <p className="mt-2 text-sm text-slate-400">NCLEX-Ready Nursing Review · Fort Hays State</p>
        </header>

        {/* ─────── HOME ─────── */}
        {view === 'home' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(SUBJECTS) as SubjectId[]).map((sid) => {
                const s = SUBJECTS[sid]
                const c = COLOR_MAP[sid]
                const qCount = ALL_QUESTIONS.filter(q => q.subject === sid).length
                return (
                  <button
                    key={sid}
                    onClick={() => pickSubject(sid)}
                    className={`group rounded-3xl border ${c.border} bg-gradient-to-br ${c.bgGrad} to-slate-900 p-6 text-left transition ${c.borderHover} hover:shadow-xl ${c.shadow}`}
                  >
                    <div className="mb-3 text-4xl">{s.icon}</div>
                    <h2 className="text-base font-bold text-white leading-tight">{s.name}</h2>
                    <p className={`mt-1 text-xs ${c.text}`}>{qCount} questions</p>
                    <div className={`mt-3 inline-block rounded-full border ${c.border} px-2 py-0.5 text-[10px] font-semibold ${c.text}`}>
                      Exam 1
                    </div>
                    <p className={`mt-3 text-xs font-semibold ${c.text} transition group-hover:translate-x-0.5`}>
                      Study now →
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-sm text-slate-300">💬 AI Tutor always available — tap the chat button anytime</p>
            </div>
          </div>
        )}

        {/* ─────── SUBJECT ─────── */}
        {view === 'subject' && (
          <div className="space-y-6">
            {/* Back + subject header */}
            <div className="flex items-center gap-3">
              <button onClick={goHome} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5">
                ← Subjects
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{subjectData.icon}</span>
                <h2 className={`text-xl font-bold ${colors.text}`}>{subjectData.name}</h2>
              </div>
              <span className="ml-auto text-xs text-slate-500">{subjectQCount} questions</span>
            </div>

            {/* Chapter tabs */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Chapters</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedChapters([])}
                  className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                    selectedChapters.length === 0
                      ? colors.tabActive
                      : 'border-white/10 text-slate-400 hover:border-white/30'
                  }`}
                >
                  All
                </button>
                {chapterList.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleChapter(c)}
                    className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      selectedChapters.includes(c)
                        ? colors.tabActive
                        : 'border-white/10 text-slate-400 hover:border-white/30'
                    }`}
                  >
                    Ch {c}
                  </button>
                ))}
              </div>
              {/* Active chapter names */}
              <div className="mt-2 space-y-1">
                {activeChapters.map(c => (
                  <p key={c} className="text-xs text-slate-500">
                    <span className={`font-semibold ${colors.text}`}>Ch {c}:</span>{' '}
                    {(subjectData.chapters as Record<number, string>)[c] ?? ''}
                  </p>
                ))}
              </div>
            </div>

            {/* Mode cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Study Games */}
              <button
                onClick={() => setView('games')}
                className={`group rounded-3xl border ${colors.border} bg-gradient-to-br ${colors.bgGrad} to-slate-900 p-6 text-left transition ${colors.borderHover} hover:shadow-xl ${colors.shadow}`}
              >
                <div className="mb-3 text-3xl">🎮</div>
                <h3 className="font-bold text-white">Study Games</h3>
                <p className="mt-1.5 text-xs text-slate-400">Flashcards, matching, beat-the-clock & case scenarios</p>
                <span className={`mt-4 inline-block text-xs font-semibold ${colors.text} transition group-hover:translate-x-0.5`}>Play →</span>
              </button>

              {/* NCLEX Practice */}
              <button
                onClick={() => setView('nclex')}
                className={`group relative rounded-3xl border ${colors.border} bg-gradient-to-br ${colors.bgGrad} to-slate-900 p-6 text-left transition ${colors.borderHover} hover:shadow-xl ${colors.shadow}`}
              >
                <div className="absolute right-4 top-4">
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
                </div>
                <div className="mb-3 text-3xl">🏥</div>
                <h3 className="font-bold text-white">NCLEX Practice</h3>
                <p className="mt-1.5 text-xs text-slate-400">SATA, prioritization & close-distractor questions with immediate feedback</p>
                <span className={`mt-4 inline-block text-xs font-semibold ${colors.text} transition group-hover:translate-x-0.5`}>Practice →</span>
              </button>

              {/* Mock Exam */}
              <button
                onClick={() => setView('test')}
                className="group rounded-3xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-600/20 to-slate-900 p-6 text-left transition hover:border-fuchsia-400 hover:shadow-xl hover:shadow-fuchsia-500/10"
              >
                <div className="mb-3 text-3xl">📝</div>
                <h3 className="font-bold text-white">Mock Exam</h3>
                <p className="mt-1.5 text-xs text-slate-400">80-minute timed exam with explanations on every miss</p>
                <span className="mt-4 inline-block text-xs font-semibold text-fuchsia-300 transition group-hover:translate-x-0.5">Start →</span>
              </button>
            </div>
          </div>
        )}

        {/* ─────── GAMES ─────── */}
        {view === 'games' && (
          <div>
            <div className="mb-5 flex items-center gap-3">
              <button onClick={goSubject} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5">
                ← {subjectData.name}
              </button>
              <span className="text-sm font-semibold text-white">Study Games</span>
            </div>

            {/* Chapter filter */}
            <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Focus chapters</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedChapters([])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selectedChapters.length === 0 ? colors.tabActive : 'border-white/10 text-slate-400'
                  }`}
                >
                  All
                </button>
                {chapterList.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleChapter(c)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      selectedChapters.includes(c) ? colors.tabActive : 'border-white/10 text-slate-400'
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
                    game === key ? `${colors.pill} border-opacity-100` : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="text-2xl">{icon}</div>
                  <div className="mt-1.5 text-xs font-semibold text-slate-200">{label}</div>
                </button>
              ))}
            </div>

            <div className="min-h-[300px]">
              {!game && <p className="text-center text-slate-500">Pick a game above to start.</p>}
              {game === 'flashcards' && <Flashcards chapters={activeChapters} subject={subject} />}
              {game === 'matching' && <Matching chapters={activeChapters} subject={subject} />}
              {game === 'timed' && <TimedQuiz chapters={activeChapters} subject={subject} />}
              {game === 'cases' && <CaseScenarios chapters={activeChapters} subject={subject} />}
            </div>
          </div>
        )}

        {/* ─────── NCLEX ─────── */}
        {view === 'nclex' && (
          <div>
            <div className="mb-5 flex items-center gap-3">
              <button onClick={goSubject} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5">
                ← {subjectData.name}
              </button>
            </div>
            <NCLEXPractice subject={subject} chapters={activeChapters} />
          </div>
        )}

        {/* ─────── TEST ─────── */}
        {view === 'test' && (
          <MockTest
            onExit={goSubject}
            subject={subject}
            chapters={activeChapters}
          />
        )}
      </div>

      <Tutor contextHint={contextHint} />
    </main>
  )
}
