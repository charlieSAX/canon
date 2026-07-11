import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

const CONTENT = 'public/content'
const schedulePath = `${CONTENT}/schedule.json`
const DAYS = 14
const PER_DAY = 5

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

const now = new Date()
const today = process.env.CANON_TODAY || formatDate(now)
const ids = readdirSync(`${CONTENT}/paintings`)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -5))
  .sort()

if (ids.length < PER_DAY) throw new Error(`Need at least ${PER_DAY} paintings to schedule a day`)

const schedule = JSON.parse(readFileSync(schedulePath, 'utf8'))
const lastScheduled = new Map()
for (const date of Object.keys(schedule).sort()) {
  for (const id of schedule[date]) lastScheduled.set(id, date)
}

for (let offset = 0; offset < DAYS; offset += 1) {
  const date = addDays(today, offset)
  if (Array.isArray(schedule[date]) && schedule[date].length === PER_DAY) continue

  const ranked = [...ids].sort((a, b) => {
    const aLast = lastScheduled.get(a)
    const bLast = lastScheduled.get(b)
    if (!aLast && bLast) return -1
    if (aLast && !bLast) return 1
    if (aLast !== bLast) return (aLast ?? '').localeCompare(bLast ?? '')
    return a.localeCompare(b)
  })
  schedule[date] = ranked.slice(0, PER_DAY)
  for (const id of schedule[date]) lastScheduled.set(id, date)
}

const ordered = Object.fromEntries(Object.entries(schedule).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(schedulePath, `${JSON.stringify(ordered, null, 2)}\n`)
writeFileSync(`${CONTENT}/index.json`, `${JSON.stringify(ids, null, 2)}\n`)
console.log(`schedule: ${DAYS} days available from ${today}; ${ids.length} paintings indexed.`)
