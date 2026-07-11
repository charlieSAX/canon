import type { Movements, Painting, Schedule } from './types'

const BASE = import.meta.env.BASE_URL

let scheduleCache: Schedule | null = null
let indexCache: string[] | null = null
const paintingCache = new Map<string, Painting>()
let movementsCache: Movements | null = null

export async function loadSchedule(): Promise<Schedule> {
  if (!scheduleCache) {
    const res = await fetch(`${BASE}content/schedule.json`)
    scheduleCache = (await res.json()) as Schedule
  }
  return scheduleCache
}

export async function loadMovements(): Promise<Movements> {
  if (!movementsCache) {
    const res = await fetch(`${BASE}content/movements.json`)
    movementsCache = (await res.json()) as Movements
  }
  return movementsCache
}

export async function loadAllPaintings(): Promise<Map<string, Painting>> {
  if (!indexCache) {
    const res = await fetch(`${BASE}content/index.json`)
    indexCache = (await res.json()) as string[]
  }
  const ids = indexCache
  const paintings = await Promise.all(ids.map(loadPainting))
  return new Map(paintings.map((painting) => [painting.id, painting]))
}

async function loadPainting(id: string): Promise<Painting> {
  const cached = paintingCache.get(id)
  if (cached) return cached
  const res = await fetch(`${BASE}content/paintings/${id}.json`)
  const painting = (await res.json()) as Painting
  paintingCache.set(id, painting)
  return painting
}

export async function paintingsFor(date: string): Promise<Painting[]> {
  const schedule = await loadSchedule()
  const ids = schedule[date]
  if (!ids) return []
  return Promise.all(ids.map(loadPainting))
}

export function imageUrl(p: Painting): string {
  return `${BASE}${p.image.src}`
}
