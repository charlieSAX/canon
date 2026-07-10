import { db, getMetaNum, getMetaStr, setMeta } from './db'
import { addDays } from './dates'

// Freeze tokens: earn 1 per 10 total completed days, hold a maximum of 2,
// auto-applied oldest gap first. Today itself never consumes a token.

let reconciling: Promise<void> | null = null

export function reconcile(today: string): Promise<void> {
  if (!reconciling) {
    reconciling = doReconcile(today).finally(() => {
      reconciling = null
    })
  }
  return reconciling
}

async function doReconcile(today: string): Promise<void> {
  const marked = (await db.days.orderBy('date').primaryKeys()) as string[]
  if (marked.length === 0) return
  const lastMarked = marked[marked.length - 1]
  const prev = await getMetaStr('reconciledThrough')
  const cursor = prev && prev > lastMarked ? prev : lastMarked
  if (cursor >= addDays(today, -1)) return
  let tokens = await getMetaNum('freezeTokens')
  let d = addDays(cursor, 1)
  while (d < today) {
    const row = await db.days.get(d)
    if (!row) {
      if (tokens > 0) {
        tokens -= 1
        await db.days.put({ date: d, kind: 'frozen', at: new Date().toISOString() })
      }
      // No token: the gap stays open and the streak walk stops there.
    }
    d = addDays(d, 1)
  }
  await setMeta('freezeTokens', tokens)
  await setMeta('reconciledThrough', addDays(today, -1))
}

// Consecutive completed local dates ending today or yesterday. Frozen days
// keep the chain unbroken but only completed days count.
export async function computeStreak(today: string): Promise<number> {
  let d = (await db.days.get(today)) ? today : addDays(today, -1)
  let streak = 0
  for (;;) {
    const row = await db.days.get(d)
    if (!row) break
    if (row.kind === 'completed') streak += 1
    d = addDays(d, -1)
  }
  return streak
}

export async function countCompletedDays(): Promise<number> {
  return db.days.filter((r) => r.kind === 'completed').count()
}
