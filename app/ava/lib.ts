import { QUESTIONS, type Question } from './questions'

export { QUESTIONS }
export type { Question }

// Lazily import subject question banks (they may not exist yet — use try/catch pattern at runtime)
// Actually: import statically and merge. The other agents will have written these files.
// If they don't exist yet, just export empty arrays.

let HA_QUESTIONS: Question[] = []
let FN_QUESTIONS: Question[] = []
let MATH_QUESTIONS: Question[] = []

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ha = require('./questions-health-assessment')
  HA_QUESTIONS = ha.HEALTH_ASSESSMENT_QUESTIONS ?? []
} catch {}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fn = require('./questions-foundations')
  FN_QUESTIONS = fn.FOUNDATIONS_QUESTIONS ?? []
} catch {}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const math = require('./questions-math')
  MATH_QUESTIONS = math.MATH_QUESTIONS ?? []
} catch {}

export const ALL_QUESTIONS: Question[] = [
  ...QUESTIONS.map(q => ({ ...q, subject: q.subject ?? 'patho' as const })),
  ...HA_QUESTIONS,
  ...FN_QUESTIONS,
  ...MATH_QUESTIONS,
]

export const SUBJECTS = {
  patho: {
    id: 'patho' as const,
    name: 'Pathophysiology',
    icon: '🧬',
    color: 'violet',
    chapters: {
      1: 'Intro to Pathophysiology',
      2: 'Altered Cells & Tissues',
      3: 'Inflammation & Tissue Repair',
      4: 'Altered Immunity',
      5: 'Infection',
    },
  },
  'health-assessment': {
    id: 'health-assessment' as const,
    name: 'Health Assessment',
    icon: '🩺',
    color: 'teal',
    chapters: {
      1: 'Components of Health Assessment',
      2: 'Health History Interview',
      3: 'Physical Assessment Techniques',
      4: 'General Survey & Vital Signs',
      5: 'Nutritional Assessment',
      6: 'Skin, Hair & Nails',
    },
  },
  foundations: {
    id: 'foundations' as const,
    name: 'Foundations of Nursing',
    icon: '📚',
    color: 'amber',
    chapters: {
      1: 'Nursing Process',
      2: 'Clinical Judgment',
      3: 'Development in Older Adults',
      4: 'Sensation & Perception',
      5: 'Promoting Safety',
      6: 'Physical Activity & Immobility',
    },
  },
  math: {
    id: 'math' as const,
    name: 'Medication Math',
    icon: '📐',
    color: 'rose',
    chapters: {
      1: 'Systems & Conversions',
      2: 'Medication Safety & Orders',
      3: 'I&O Calculation',
      4: 'Dimensional Analysis',
      5: 'Oral Doses & Reconstitution',
    },
  },
} as const

export type SubjectId = keyof typeof SUBJECTS
export const CHAPTER_NAMES: Record<number, string> = SUBJECTS.patho.chapters  // legacy compat

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function bySubjectAndChapters(subject: SubjectId, chapters: number[]): Question[] {
  return ALL_QUESTIONS.filter(
    (q) => q.subject === subject && (chapters.length === 0 || chapters.includes(q.chapter))
  )
}

// Legacy compat for existing game components
export function byChapters(chapters: number[]): Question[] {
  return QUESTIONS.filter((q) => chapters.length === 0 || chapters.includes(q.chapter))
}

export type ShuffledQuestion = Question & { shuffledOptions: string[]; shuffledAnswer: number | undefined; shuffledAnswers?: number[] }

export function shuffleOptions(q: Question): ShuffledQuestion {
  if (q.type === 'tf') {
    return { ...q, shuffledOptions: q.options, shuffledAnswer: q.answer ?? 0, shuffledAnswers: q.answers }
  }
  const indexed = q.options.map((opt, i) => ({ opt, i }))
  const sh = shuffle(indexed)
  const shuffledOptions = sh.map((x) => x.opt)
  const shuffledAnswer = sh.findIndex((x) => x.i === (q.answer ?? 0))
  const shuffledAnswers = q.answers ? q.answers.map((a) => sh.findIndex((x) => x.i === a)) : undefined
  return { ...q, shuffledOptions, shuffledAnswer, shuffledAnswers }
}

export function termPairs(subject: SubjectId, chapters: number[]): { term: string; definition: string; chapter: number }[] {
  const seen = new Set<string>()
  const out: { term: string; definition: string; chapter: number }[] = []
  for (const q of bySubjectAndChapters(subject, chapters)) {
    if (q.term && q.definition) {
      const key = q.term.toLowerCase().trim()
      if (!seen.has(key)) {
        seen.add(key)
        out.push({ term: q.term, definition: q.definition, chapter: q.chapter })
      }
    }
  }
  return out
}
