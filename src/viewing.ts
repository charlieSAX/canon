import type { Lang, Painting } from './types'
import { db, getMetaNum, setMeta } from './db'
import { ensureCard } from './fsrsAdapter'
import { awardPoints } from './points'
import { countCompletedDays } from './streak'
import { newlyCompleted, milestoneLine } from './collections'
import { loadAllPaintings, loadMovements } from './content'

export interface ViewResult {
  firstToday: boolean
  gained: number
  completedDay: boolean
  milestones: string[]
}

// A painting is "viewed" the first time its info card is opened that day.
export async function recordView(
  p: Painting,
  today: string,
  scheduledIds: string[],
  lang: Lang
): Promise<ViewResult> {
  const key = `${today}|${p.id}`
  if (await db.dayViews.get(key)) {
    return { firstToday: false, gained: 0, completedDay: false, milestones: [] }
  }
  await db.dayViews.put({ key, date: today, paintingId: p.id })

  const seenRows = await db.seen.toArray()
  const seenBefore = new Set(seenRows.map((r) => r.paintingId))
  const isNewlySeen = !seenBefore.has(p.id)
  if (isNewlySeen) {
    await db.seen.put({ paintingId: p.id, firstSeen: today })
    await ensureCard(p.id, new Date())
  }

  // Critical path first: points and day completion must land immediately and
  // must never block on loading the whole collection (that fetch is slow on a
  // cold cache and would otherwise leave the streak unrecorded).
  const gained = await awardPoints(10, today)

  let completedDay = false
  const viewedToday = await db.dayViews.where('date').equals(today).toArray()
  const viewedIds = new Set(viewedToday.map((v) => v.paintingId))
  if (scheduledIds.length > 0 && scheduledIds.every((id) => viewedIds.has(id)) && !(await db.days.get(today))) {
    await db.days.put({ date: today, kind: 'completed', at: new Date().toISOString() })
    completedDay = true
    const total = await countCompletedDays()
    if (total % 10 === 0) {
      const tokens = await getMetaNum('freezeTokens')
      await setMeta('freezeTokens', Math.min(2, tokens + 1))
    }
    if (total === 1 && navigator.storage?.persist) {
      // Resist iOS storage eviction once the habit has begun.
      void navigator.storage.persist()
    }
  }

  // Collection milestones are a best-effort flourish: they need the whole
  // painting set, so a slow or failed load must not affect points or streak.
  const milestones: string[] = []
  if (isNewlySeen) {
    try {
      const all = [...(await loadAllPaintings()).values()]
      const movements = await loadMovements()
      for (const set of newlyCompleted(all, seenBefore, p.id, movements, lang)) {
        milestones.push(milestoneLine(set, lang))
      }
    } catch {
      // ignore: the milestone toast is non-essential
    }
  }

  return { firstToday: true, gained, completedDay, milestones }
}
