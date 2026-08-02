// Where the library stands in its own cycle. The pool divided by five is the
// cycle length in days, and nothing repeats until a pass completes, so the
// halfway point of a pass is the moment to grow the pool: paintings added then
// enter the very next pass rather than waiting a full cycle.
//
// Prints a human line and, with --json, a machine object for the workflow.
import { readFileSync, readdirSync, existsSync } from 'node:fs'

const CONTENT = 'public/content'
const PER_DAY = 5

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function daysBetween(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / 86400000)
}

const today = process.env.CANON_TODAY || formatDate(new Date())
const pool = readdirSync(`${CONTENT}/paintings`).filter((f) => f.endsWith('.json')).length
const schedule = JSON.parse(readFileSync(`${CONTENT}/schedule.json`, 'utf8'))

// Replay the schedule the way the scheduler does, so "pass start" here means
// exactly what it means there.
let passStart = null
let passUsed = new Set()
for (const date of Object.keys(schedule).sort()) {
  if (date > today) continue
  for (const id of schedule[date]) {
    if (passUsed.has(id)) {
      passUsed = new Set()
      passStart = date
    }
    if (passStart === null) passStart = date
    passUsed.add(id)
  }
}

const cycleDays = Math.ceil(pool / PER_DAY)
const dayInPass = passStart ? daysBetween(passStart, today) + 1 : 0
const halfway = Math.ceil(cycleDays / 2)

const stagedDir = 'pipeline/staged'
const staged = existsSync(stagedDir)
  ? readdirSync(stagedDir).filter((f) => f.endsWith('.json')).length
  : 0

const briefsPath = 'pipeline/briefs-v4.json'
const briefs = existsSync(briefsPath) ? JSON.parse(readFileSync(briefsPath, 'utf8')) : {}
const live = new Set(readdirSync(`${CONTENT}/paintings`).map((f) => f.slice(0, -5)))
const queue = Object.entries(briefs)
  .filter(([id, brief]) => brief.usable && !live.has(id))
  .map(([id]) => id)

const status = {
  today,
  pool,
  cycleDays,
  passStart,
  dayInPass,
  halfway,
  atHalfway: dayInPass >= halfway,
  seenThisPass: passUsed.size,
  staged,
  queueReadyToAuthor: queue.length,
  nextBatch: queue.slice(0, 25)
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(status, null, 2))
} else {
  console.log(
    `library: ${pool} paintings, ${cycleDays} day cycle. Pass began ${passStart ?? 'never'}, ` +
      `day ${dayInPass} of ${cycleDays} (halfway at ${halfway}). ` +
      `${status.atHalfway ? 'AT OR PAST HALFWAY' : 'not yet halfway'}. ` +
      `${staged} staged, ${queue.length} verified candidate(s) awaiting authoring.`
  )
}
