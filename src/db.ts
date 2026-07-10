import Dexie, { type Table } from 'dexie'

// ALL user state lives in these tables. No localStorage anywhere.

export interface SeenRow {
  paintingId: string
  firstSeen: string
}

export interface DayViewRow {
  key: string // `${date}|${paintingId}`
  date: string
  paintingId: string
}

export interface DayRow {
  date: string
  kind: 'completed' | 'frozen'
  at: string
}

export interface CardRow {
  paintingId: string
  due: string // ISO, indexed for due-order queries
  card: string // full ts-fsrs Card as JSON with ISO dates
}

export interface MetaRow {
  key: string
  value: number | string
}

class CanonDB extends Dexie {
  seen!: Table<SeenRow, string>
  dayViews!: Table<DayViewRow, string>
  days!: Table<DayRow, string>
  cards!: Table<CardRow, string>
  meta!: Table<MetaRow, string>

  constructor() {
    super('canon')
    this.version(1).stores({
      seen: 'paintingId',
      dayViews: 'key, date',
      days: 'date',
      cards: 'paintingId, due',
      meta: 'key'
    })
  }
}

export const db = new CanonDB()

export async function getMetaNum(key: string, fallback = 0): Promise<number> {
  const row = await db.meta.get(key)
  return typeof row?.value === 'number' ? row.value : fallback
}

export async function getMetaStr(key: string): Promise<string | undefined> {
  const row = await db.meta.get(key)
  return typeof row?.value === 'string' ? row.value : undefined
}

export async function setMeta(key: string, value: number | string): Promise<void> {
  await db.meta.put({ key, value })
}

export async function exportState(): Promise<string> {
  const dump = {
    app: 'canon',
    version: 1,
    exportedAt: new Date().toISOString(),
    seen: await db.seen.toArray(),
    dayViews: await db.dayViews.toArray(),
    days: await db.days.toArray(),
    cards: await db.cards.toArray(),
    meta: await db.meta.toArray()
  }
  return JSON.stringify(dump, null, 2)
}

export async function importState(json: string): Promise<void> {
  const dump = JSON.parse(json)
  if (dump?.app !== 'canon') throw new Error('Not a CANON export file')
  await db.transaction('rw', [db.seen, db.dayViews, db.days, db.cards, db.meta], async () => {
    await db.seen.clear()
    await db.dayViews.clear()
    await db.days.clear()
    await db.cards.clear()
    await db.meta.clear()
    await db.seen.bulkPut(dump.seen ?? [])
    await db.dayViews.bulkPut(dump.dayViews ?? [])
    await db.days.bulkPut(dump.days ?? [])
    await db.cards.bulkPut(dump.cards ?? [])
    await db.meta.bulkPut(dump.meta ?? [])
  })
}
