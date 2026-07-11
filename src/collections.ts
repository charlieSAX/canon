import type { Lang, Movements, Painting } from './types'
import { centuryName } from './i18n'

export interface CollectionSet {
  kind: 'artist' | 'movement' | 'century'
  key: string // stable identity: artist name, movement slug, or century number
  label: string // display in the current language
  total: number
  seen: number
}

export function buildCollections(
  all: Painting[],
  seenIds: Set<string>,
  movements: Movements,
  lang: Lang
): CollectionSet[] {
  const sets = new Map<string, CollectionSet>()
  for (const p of all) {
    const entries: Array<[CollectionSet['kind'], string, string]> = [
      ['artist', p.artist, p.artist],
      ['movement', p.movement, movements[p.movement]?.name[lang] ?? p.movement],
      ['century', String(Math.ceil(p.year / 100)), centuryName(p.year, lang)]
    ]
    for (const [kind, key, label] of entries) {
      const id = `${kind}|${key}`
      const set = sets.get(id) ?? { kind, key, label, total: 0, seen: 0 }
      set.total += 1
      if (seenIds.has(p.id)) set.seen += 1
      sets.set(id, set)
    }
  }
  return [...sets.values()]
}

// Sets completed by adding `newId` to the seen pool.
export function newlyCompleted(
  all: Painting[],
  seenBefore: Set<string>,
  newId: string,
  movements: Movements,
  lang: Lang
): CollectionSet[] {
  const after = new Set(seenBefore)
  after.add(newId)
  const before = buildCollections(all, seenBefore, movements, lang)
  const now = buildCollections(all, after, movements, lang)
  const doneBefore = new Set(before.filter((s) => s.seen === s.total).map((s) => `${s.kind}|${s.key}`))
  return now.filter((s) => s.seen === s.total && !doneBefore.has(`${s.kind}|${s.key}`))
}

export function milestoneLine(set: CollectionSet, lang: Lang): string {
  if (set.kind === 'artist') {
    const surname = set.label.split(' ').slice(-1)[0]
    return lang === 'es' ? `Cada ${surname}, visto.` : `Every ${surname}, seen.`
  }
  return lang === 'es' ? `${set.label}, completado.` : `${set.label}, complete.`
}
