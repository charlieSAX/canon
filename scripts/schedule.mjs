import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

const CONTENT = 'public/content'
const schedulePath = `${CONTENT}/schedule.json`
const DAYS = 14
const PER_DAY = 5

// A painting must rest this many days before it can be hung again. The pool of
// 100 at five a day means every painting returns once every 20 days on average;
// the rest floor stops that average hiding a two day gap at a pass boundary.
const MIN_REST_DAYS = 17

// No day repeats an artist, and no day leans on one movement.
const MAX_PER_MOVEMENT = 2

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(value, amount) {
  const date = parseDate(value)
  date.setDate(date.getDate() + amount)
  return formatDate(date)
}

function daysBetween(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / 86400000)
}

// Deterministic per day randomness: the same date and the same history always
// produce the same five paintings, so the weekly cron never churns the file.
function seedFrom(text) {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function mulberry32(seed) {
  let state = seed
  return function next() {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled(items, rand) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const now = new Date()
const today = process.env.CANON_TODAY || formatDate(now)

// CANON_REBUILD=1 redeals the days after today and leaves today alone, which
// is the safe default: today's five are bound to views and day completion.
// CANON_REBUILD=today also redeals today, for when today is worth losing.
const rebuildToday = process.env.CANON_REBUILD === 'today'
const rebuild = process.env.CANON_REBUILD === '1' || rebuildToday

const ids = readdirSync(`${CONTENT}/paintings`)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -5))
  .sort()

if (ids.length < PER_DAY) throw new Error(`Need at least ${PER_DAY} paintings to schedule a day`)

const meta = new Map(
  ids.map((id) => {
    const painting = JSON.parse(readFileSync(`${CONTENT}/paintings/${id}.json`, 'utf8'))
    return [id, { artist: painting.artist, movement: painting.movement, title: painting.title.en }]
  })
)

const schedule = JSON.parse(readFileSync(schedulePath, 'utf8'))

// Rebuild reopens days that have not been served yet. Past days stay frozen:
// their ids are already bound to views, points and completed days.
const displaced = rebuildToday && Array.isArray(schedule[today]) ? [...schedule[today]] : []
if (rebuild) {
  for (const date of Object.keys(schedule)) {
    if (date > today || (rebuildToday && date === today)) delete schedule[date]
  }
}

// A pass is one sweep of the whole pool. Nothing returns until the pass ends,
// which is what holds the average gap at pool size divided by five.
const lastHung = new Map()
const hungOn = new Map()
let passUsed = new Set()

function apply(date, dayIds) {
  hungOn.set(date, [...(hungOn.get(date) ?? []), ...dayIds])
  for (const id of dayIds) {
    if (passUsed.has(id)) passUsed = new Set()
    passUsed.add(id)
    lastHung.set(id, date)
  }
}

// A second Van Gogh the morning after the first reads as a repeat even though
// the painting is new, and the two Descents from the Cross share a title. Look
// back two days and prefer paintings that clash with neither.
function recentKin(date) {
  const artists = new Set()
  const titles = new Set()
  for (const back of [1, 2]) {
    for (const id of hungOn.get(addDays(date, -back)) ?? []) {
      const kin = meta.get(id)
      if (!kin) continue
      artists.add(kin.artist)
      titles.add(kin.title)
    }
  }
  return { artists, titles }
}

function restDays(id, date) {
  const last = lastHung.get(id)
  return last ? daysBetween(last, date) : Number.POSITIVE_INFINITY
}

function pickDay(date) {
  const rand = mulberry32(seedFrom(date))
  if (ids.filter((id) => !passUsed.has(id)).length < PER_DAY) passUsed = new Set()
  const pool = ids.filter((id) => !passUsed.has(id))

  const chosen = []
  const artists = new Set()
  const perMovement = new Map()

  function take(candidates, capMovement) {
    for (const id of candidates) {
      if (chosen.length === PER_DAY) return
      if (chosen.includes(id)) continue
      const { artist, movement } = meta.get(id)
      if (artists.has(artist)) continue
      if (capMovement && (perMovement.get(movement) ?? 0) >= MAX_PER_MOVEMENT) continue
      chosen.push(id)
      artists.add(artist)
      perMovement.set(movement, (perMovement.get(movement) ?? 0) + 1)
    }
  }

  // Rested paintings, shuffled, so a returning painting arrives beside
  // different neighbours every pass instead of in a fixed block of five.
  const rested = shuffled(
    pool.filter((id) => restDays(id, date) >= MIN_REST_DAYS),
    rand
  )
  const kin = recentKin(date)
  take(
    rested.filter((id) => !kin.artists.has(meta.get(id).artist) && !kin.titles.has(meta.get(id).title)),
    true
  )
  take(rested, true)
  take(rested, false)

  // Fallbacks, longest rested first, so a tight pass tail still yields the
  // widest gap available rather than whatever sorts first alphabetically.
  const byRest = [...pool].sort((a, b) => restDays(b, date) - restDays(a, date) || a.localeCompare(b))
  take(byRest, false)
  for (const id of byRest) {
    if (chosen.length === PER_DAY) break
    if (!chosen.includes(id)) chosen.push(id)
  }
  return chosen
}

const windowDates = Array.from({ length: DAYS }, (_, offset) => addDays(today, offset))
const dates = [...new Set([...Object.keys(schedule), ...windowDates])].sort()

let added = 0
for (const date of dates) {
  // Paintings pulled out of today may already have been viewed on the device,
  // so they count as hung today: they leave the pass and start resting now.
  if (date === today && displaced.length > 0) apply(today, displaced)

  const existing = schedule[date]
  if (Array.isArray(existing) && existing.length === PER_DAY) {
    apply(date, existing)
    continue
  }
  if (date < today) continue
  schedule[date] = pickDay(date)
  apply(date, schedule[date])
  added += 1
}

const ordered = Object.fromEntries(Object.entries(schedule).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(schedulePath, `${JSON.stringify(ordered, null, 2)}\n`)
writeFileSync(`${CONTENT}/index.json`, `${JSON.stringify(ids, null, 2)}\n`)
console.log(
  `schedule: ${DAYS} days available from ${today}; ${added} day(s) written; ${ids.length} paintings indexed.`
)
