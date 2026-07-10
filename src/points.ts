import { getMetaNum, setMeta } from './db'
import { computeStreak } from './streak'

// Streak multiplier: 1 + streak/100, capped at 2.0, applied at award time,
// rounded to the nearest integer.
export async function awardPoints(base: number, today: string): Promise<number> {
  const streak = await computeStreak(today)
  const multiplier = Math.min(2, 1 + streak / 100)
  const gained = Math.round(base * multiplier)
  await setMeta('points', (await getMetaNum('points')) + gained)
  return gained
}
