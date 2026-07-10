import type { Painting } from './types'
import { db, getMetaNum, setMeta } from './db'
import { ensureCard } from './fsrsAdapter'
import { awardPoints } from './points'
import { countCompletedDays } from './streak'
import { newlyCompleted, milestoneLine } from './collections'
import { loadAllPaintings } from './content'

export interface ViewResult {
  firstToday: boolean
  gained: number
  completedDay: boolean
  milestones: string[]
}

// A painting is "viewed" the first time its info card is opened that day.
export async function recordView(p: Painting, today: string, scheduledIds: string[]): Promise<ViewResult> {
  const key = `${today}|${p.id}`
  if (await db.dayViews.get(key)) {
    return { firstToday: false, gained: 0, completedDay: false, milestones: [] }
  }
  await db.dayViews.put({ key, date: today, paintingId: p.id })

  const milestones: string[] = []
  const seenRows = await db.seen.toArray()
  const seenBefore = new Set(seenRows.map((r) => r.paintingId))
  if (!seenBefore.has(p.id)) {
    await db.seen.put({ paintingId: p.id, firstSeen: today })
    await ensureCard(p.id, new Date())
    const all = [...(await loadAllPaintings()).values()]
    for (const set of newlyCompleted(all, seenBefore, p.id)) {
      milestones.push(milestoneLine(set))
    }
  }

  const gained = await awardPoints(10, today)

  // Day completion: all scheduled paintings viewed, recorded once per date.
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

  return { firstToday: true, gained, completedDay, milestones }
}
