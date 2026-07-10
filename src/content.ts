import type { Painting, Schedule } from './types'

const BASE = import.meta.env.BASE_URL

let scheduleCache: Schedule | null = null
let paintingsCache: Map<string, Painting> | null = null

export async function loadSchedule(): Promise<Schedule> {
  if (!scheduleCache) {
    const res = await fetch(`${BASE}content/schedule.json`)
    scheduleCache = (await res.json()) as Schedule
  }
  return scheduleCache
}

export async function loadAllPaintings(): Promise<Map<string, Painting>> {
  if (!paintingsCache) {
    const schedule = await loadSchedule()
    const ids = [...new Set(Object.values(schedule).flat())]
    const entries = await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`${BASE}content/paintings/${id}.json`)
        return [id, (await res.json()) as Painting] as const
      })
    )
    paintingsCache = new Map(entries)
  }
  return paintingsCache
}

export async function paintingsFor(date: string): Promise<Painting[]> {
  const schedule = await loadSchedule()
  const ids = schedule[date]
  if (!ids) return []
  const all = await loadAllPaintings()
  return ids.map((id) => all.get(id)).filter((p): p is Painting => Boolean(p))
}

export function imageUrl(p: Painting): string {
  return `${BASE}${p.image.src}`
}

export function ordinalCentury(year: number): string {
  const c = Math.ceil(year / 100)
  const suffix = c % 10 === 1 && c !== 11 ? 'st' : c % 10 === 2 && c !== 12 ? 'nd' : c % 10 === 3 && c !== 13 ? 'rd' : 'th'
  return `${c}${suffix} century`
}
