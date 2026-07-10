import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs'
import { db, type CardRow } from './db'

// ts-fsrs is the scheduler. Nothing here re-implements scheduling.
const scheduler = fsrs()

function serialise(paintingId: string, card: Card): CardRow {
  return { paintingId, due: card.due.toISOString(), card: JSON.stringify(card) }
}

export function reviveCard(row: CardRow): Card {
  const raw = JSON.parse(row.card) as Card & { due: string; last_review?: string }
  return {
    ...raw,
    due: new Date(raw.due),
    last_review: raw.last_review ? new Date(raw.last_review) : undefined
  }
}

export async function ensureCard(paintingId: string, now: Date): Promise<void> {
  const existing = await db.cards.get(paintingId)
  if (existing) return
  await db.cards.put(serialise(paintingId, createEmptyCard(now)))
}

// Wrong = Again. Correct: under 3s Easy, 3 to 10s Good, over 10s Hard.
export function gradeFor(correct: boolean, seconds: number): Grade {
  if (!correct) return Rating.Again
  if (seconds < 3) return Rating.Easy
  if (seconds <= 10) return Rating.Good
  return Rating.Hard
}

// Reviews the painting's card and returns the post-review interval in days.
export async function reviewCard(paintingId: string, grade: Grade, now: Date): Promise<number> {
  const row = await db.cards.get(paintingId)
  if (!row) {
    await ensureCard(paintingId, now)
    return reviewCard(paintingId, grade, now)
  }
  const next = scheduler.next(reviveCard(row), now, grade)
  await db.cards.put(serialise(paintingId, next.card))
  return next.card.scheduled_days
}
