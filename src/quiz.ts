import type { Painting } from './types'
import { db } from './db'
import { loadAllPaintings } from './content'
import { ordinalCentury } from './content'

export const SESSION_LENGTH = 8

export type QuestionType = 'title-to-painting' | 'painting-to-artist' | 'fact-to-painting' | 'chronology'

export interface Question {
  type: QuestionType
  target: Painting
  options: Painting[] // shuffled; includes target for choice types, the sequence pool for chronology
}

export async function quizUnlockThreshold(): Promise<number> {
  const total = (await loadAllPaintings()).size
  return Math.min(15, total)
}

export async function seenCount(): Promise<number> {
  return db.seen.count()
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Sample 3 from the seen pool, preferring same century or movement when at
// least 3 such candidates exist, otherwise uniform random. The answer key
// (id, title or artist) is never duplicated among the options. With a large
// Phase 2 pool, key dedup can leave fewer than 3 distractors when kin share
// an artist; the question renders with fewer options rather than duplicating.
function distractors(target: Painting, pool: Painting[], keyOf: (p: Painting) => string, n = 3): Painting[] {
  const used = new Set([keyOf(target)])
  const others = pool.filter((p) => p.id !== target.id && !used.has(keyOf(p)))
  const kin = others.filter(
    (p) => p.movement === target.movement || ordinalCentury(p.year) === ordinalCentury(target.year)
  )
  const source = kin.length >= n ? kin : others
  const out: Painting[] = []
  for (const p of shuffle(source)) {
    if (out.length === n) break
    if (used.has(keyOf(p))) continue
    used.add(keyOf(p))
    out.push(p)
  }
  return out
}

const KEY_FOR: Record<Exclude<QuestionType, 'chronology'>, (p: Painting) => string> = {
  'title-to-painting': (p) => p.id,
  'painting-to-artist': (p) => p.artist,
  'fact-to-painting': (p) => p.id
}

const ROTATION: QuestionType[] = ['title-to-painting', 'painting-to-artist', 'fact-to-painting', 'chronology']

export async function buildSession(now: Date): Promise<Question[]> {
  const all = await loadAllPaintings()
  const seenRows = await db.seen.toArray()
  const pool = seenRows
    .map((r) => all.get(r.paintingId))
    .filter((p): p is Painting => Boolean(p))
  const poolById = new Map(pool.map((p) => [p.id, p]))

  const cards = await db.cards.toArray()
  const sorted = [...cards].sort((a, b) => a.due.localeCompare(b.due))
  const nowIso = now.toISOString()
  const due = sorted.filter((c) => c.due <= nowIso)
  const upcoming = sorted.filter((c) => c.due > nowIso)
  const picked = [...due, ...upcoming]
    .map((c) => poolById.get(c.paintingId))
    .filter((p): p is Painting => Boolean(p))
    .slice(0, SESSION_LENGTH)

  const questions: Question[] = []
  let rotationIndex = 0
  for (const target of picked) {
    let type = ROTATION[rotationIndex % ROTATION.length]
    // Chronology needs three paintings with distinct years in the pool.
    if (type === 'chronology') {
      const candidates = pool.filter((p) => p.id !== target.id && p.year !== target.year)
      const distinctYears = new Set(candidates.map((p) => p.year))
      if (distinctYears.size < 2) type = ROTATION[(rotationIndex + 1) % ROTATION.length]
    }
    rotationIndex += 1

    if (type === 'chronology') {
      const candidates = shuffle(pool.filter((p) => p.id !== target.id && p.year !== target.year))
      const chosen: Painting[] = [target]
      for (const c of candidates) {
        if (chosen.length === 3) break
        if (!chosen.some((x) => x.year === c.year)) chosen.push(c)
      }
      questions.push({ type, target, options: shuffle(chosen) })
    } else {
      const keyOf = KEY_FOR[type]
      const opts = shuffle([target, ...distractors(target, pool, keyOf)])
      questions.push({ type, target, options: opts })
    }
  }
  return questions
}
