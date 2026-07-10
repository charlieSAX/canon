import type { Painting } from './types'
import { ordinalCentury } from './content'

export interface CollectionSet {
  kind: 'artist' | 'movement' | 'century'
  name: string
  total: number
  seen: number
}

export function buildCollections(all: Painting[], seenIds: Set<string>): CollectionSet[] {
  const sets = new Map<string, CollectionSet>()
  for (const p of all) {
    const keys: Array<[CollectionSet['kind'], string]> = [
      ['artist', p.artist],
      ['movement', p.movement],
      ['century', ordinalCentury(p.year)]
    ]
    for (const [kind, name] of keys) {
      const id = `${kind}|${name}`
      const set = sets.get(id) ?? { kind, name, total: 0, seen: 0 }
      set.total += 1
      if (seenIds.has(p.id)) set.seen += 1
      sets.set(id, set)
    }
  }
  return [...sets.values()]
}

// Sets completed by adding `newId` to the seen pool.
export function newlyCompleted(all: Painting[], seenBefore: Set<string>, newId: string): CollectionSet[] {
  const after = new Set(seenBefore)
  after.add(newId)
  const before = buildCollections(all, seenBefore)
  const now = buildCollections(all, after)
  const completeNow = now.filter((s) => s.seen === s.total)
  const completeBefore = new Set(
    before.filter((s) => s.seen === s.total).map((s) => `${s.kind}|${s.name}`)
  )
  return completeNow.filter((s) => !completeBefore.has(`${s.kind}|${s.name}`))
}

export function milestoneLine(set: CollectionSet): string {
  if (set.kind === 'artist') {
    const surname = set.name.split(' ').slice(-1)[0]
    return `Every ${surname}, seen.`
  }
  if (set.kind === 'movement') return `${set.name}, complete.`
  return `The ${set.name}, complete.`
}
