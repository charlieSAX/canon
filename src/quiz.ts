import type { Lang, Painting } from './types'
import { db } from './db'
import { loadAllPaintings, loadMovements } from './content'

export const SESSION_LENGTH = 8

export type QuestionType =
  | 'title-to-painting'
  | 'painting-to-artist'
  | 'point'
  | 'fact-to-painting'
  | 'style'
  | 'chronology'
  | 'notable'

export type Question =
  | { kind: 'image-grid'; type: 'title-to-painting' | 'fact-to-painting' | 'notable'; target: Painting; prompt: string; options: Painting[] }
  | { kind: 'text-choice'; type: 'painting-to-artist' | 'point' | 'style'; target: Painting; prompt: string; options: Array<{ key: string; label: string }>; correctKey: string }
  | { kind: 'chronology'; type: 'chronology'; target: Painting; options: Painting[] }

export async function quizUnlockThreshold(): Promise<number> {
  const total = (await loadAllPaintings()).size
  return Math.min(15, total)
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
// (id, artist or point text) is never duplicated among the options. With a
// large pool, key dedup can leave fewer than 3 distractors when kin share a
// key; the question renders with fewer options rather than duplicating.
function distractors(target: Painting, pool: Painting[], keyOf: (p: Painting) => string, n = 3): Painting[] {
  const used = new Set([keyOf(target)])
  const others = pool.filter((p) => p.id !== target.id && !used.has(keyOf(p)))
  const kin = others.filter(
    (p) => p.movement === target.movement || Math.ceil(p.year / 100) === Math.ceil(target.year / 100)
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

const ROTATION: QuestionType[] = [
  'title-to-painting',
  'point',
  'painting-to-artist',
  'notable',
  'style',
  'fact-to-painting',
  'chronology'
]

function feasible(type: QuestionType, target: Painting, pool: Painting[]): boolean {
  if (type === 'chronology') {
    const years = new Set(pool.filter((p) => p.id !== target.id && p.year !== target.year).map((p) => p.year))
    return years.size >= 2
  }
  if (type === 'notable') return target.notables.length > 0
  return true
}

export async function buildSession(now: Date, lang: Lang): Promise<Question[]> {
  const all = await loadAllPaintings()
  const movements = await loadMovements()
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
  let r = 0
  for (const target of picked) {
    let type = ROTATION[r % ROTATION.length]
    for (let hop = 0; hop < ROTATION.length && !feasible(type, target, pool); hop += 1) {
      type = ROTATION[(r + hop + 1) % ROTATION.length]
    }
    r += 1

    if (type === 'chronology') {
      const candidates = shuffle(pool.filter((p) => p.id !== target.id && p.year !== target.year))
      const chosen: Painting[] = [target]
      for (const c of candidates) {
        if (chosen.length === 3) break
        if (!chosen.some((x) => x.year === c.year)) chosen.push(c)
      }
      questions.push({ kind: 'chronology', type, target, options: shuffle(chosen) })
    } else if (type === 'title-to-painting' || type === 'fact-to-painting' || type === 'notable') {
      const prompt =
        type === 'title-to-painting'
          ? target.title[lang]
          : type === 'fact-to-painting'
            ? target.fact[lang]
            : target.notables[Math.floor(Math.random() * target.notables.length)][lang]
      const keyOf = type === 'title-to-painting' ? (p: Painting) => p.title[lang] : (p: Painting) => p.id
      const opts = shuffle([target, ...distractors(target, pool, keyOf)])
      questions.push({ kind: 'image-grid', type, target, prompt, options: opts })
    } else if (type === 'painting-to-artist') {
      const opts = shuffle([target, ...distractors(target, pool, (p) => p.artist)])
      questions.push({
        kind: 'text-choice',
        type,
        target,
        prompt: '',
        options: opts.map((p) => ({ key: p.artist, label: p.artist })),
        correctKey: target.artist
      })
    } else if (type === 'point') {
      const opts = shuffle([target, ...distractors(target, pool, (p) => p.text[lang].point)])
      questions.push({
        kind: 'text-choice',
        type,
        target,
        prompt: '',
        options: opts.map((p) => ({ key: p.id, label: p.text[lang].point })),
        correctKey: target.id
      })
    } else {
      // style: movement options drawn from the seen pool, topped up from all
      // content movements when the pool is narrow.
      const poolSlugs = [...new Set(pool.map((p) => p.movement))].filter((m) => m !== target.movement)
      const allSlugs = [...new Set([...all.values()].map((p) => p.movement))].filter(
        (m) => m !== target.movement && !poolSlugs.includes(m)
      )
      const slugs = [target.movement, ...shuffle(poolSlugs).slice(0, 3)]
      for (const s of shuffle(allSlugs)) {
        if (slugs.length === 4) break
        slugs.push(s)
      }
      questions.push({
        kind: 'text-choice',
        type,
        target,
        prompt: '',
        options: shuffle(slugs).map((s) => ({ key: s, label: movements[s]?.name[lang] ?? s })),
        correctKey: target.movement
      })
    }
  }
  return questions
}
