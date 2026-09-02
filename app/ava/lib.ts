import { QUESTIONS, type Question } from './questions'

export { QUESTIONS }
export type { Question }

export const CHAPTER_NAMES: Record<number, string> = {
  1: 'Intro to Pathophysiology',
  2: 'Altered Cells & Tissues',
  3: 'Inflammation & Tissue Repair',
  4: 'Altered Immunity',
  5: 'Infection',
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function byChapters(chapters: number[]): Question[] {
  if (!chapters.length) return QUESTIONS
  return QUESTIONS.filter((q) => chapters.includes(q.chapter))
}

// Returns a shuffled question with its options shuffled too, remapping the answer index.
export type ShuffledQuestion = Question & { shuffledOptions: string[]; shuffledAnswer: number }

export function shuffleOptions(q: Question): ShuffledQuestion {
  if (q.type === 'tf') {
    return { ...q, shuffledOptions: q.options, shuffledAnswer: q.answer }
  }
  const indexed = q.options.map((opt, i) => ({ opt, i }))
  const sh = shuffle(indexed)
  const shuffledOptions = sh.map((x) => x.opt)
  const shuffledAnswer = sh.findIndex((x) => x.i === q.answer)
  return { ...q, shuffledOptions, shuffledAnswer }
}

// Flashcard / matching pairs: only questions that carry term + definition.
export function termPairs(chapters: number[]): { term: string; definition: string; chapter: number }[] {
  const seen = new Set<string>()
  const out: { term: string; definition: string; chapter: number }[] = []
  for (const q of byChapters(chapters)) {
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
