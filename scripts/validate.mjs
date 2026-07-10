// Content validation, run locally and in CI before every build.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const errors = []
const CONTENT = 'public/content'

const schedule = JSON.parse(readFileSync(path.join(CONTENT, 'schedule.json'), 'utf8'))
const paintingFiles = readdirSync(path.join(CONTENT, 'paintings')).filter((f) => f.endsWith('.json'))

const paintings = new Map()
for (const file of paintingFiles) {
  const p = JSON.parse(readFileSync(path.join(CONTENT, 'paintings', file), 'utf8'))
  if (paintings.has(p.id)) errors.push(`duplicate painting id: ${p.id}`)
  if (p.id !== path.basename(file, '.json')) errors.push(`${file}: id "${p.id}" does not match filename`)
  paintings.set(p.id, p)

  for (const field of ['title', 'artist', 'movement', 'medium', 'dimensions', 'fact']) {
    if (typeof p[field] !== 'string' || p[field].trim() === '') errors.push(`${p.id}: empty field "${field}"`)
  }
  if (!Number.isInteger(p.year)) errors.push(`${p.id}: year must be an integer`)
  for (const section of ['scene', 'craft', 'painter']) {
    if (typeof p.text?.[section] !== 'string' || p.text[section].trim() === '')
      errors.push(`${p.id}: empty text.${section}`)
  }
  if (typeof p.image?.source_url !== 'string' || p.image.source_url.trim() === '')
    errors.push(`${p.id}: missing image.source_url`)
  if (typeof p.image?.license_note !== 'string' || p.image.license_note.trim() === '')
    errors.push(`${p.id}: missing image.license_note`)
  if (!existsSync(path.join('public', p.image?.src ?? ''))) errors.push(`${p.id}: image file missing: ${p.image?.src}`)
}

// Every scheduled id resolves to a painting JSON file and an existing image.
for (const [date, ids] of Object.entries(schedule)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(`schedule: bad date key "${date}"`)
  if (!Array.isArray(ids) || ids.length === 0) errors.push(`schedule ${date}: empty entry`)
  for (const id of ids) {
    if (!paintings.has(id)) errors.push(`schedule ${date}: unknown painting id "${id}"`)
  }
}

// Runway: at least MIN_RUNWAY days scheduled from today (local date) onward.
const MIN_RUNWAY = 2 // v1; raise to 7 when the Phase 2 pipeline lands
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const runway = Object.keys(schedule).filter((d) => d >= today).length
if (runway < MIN_RUNWAY) errors.push(`schedule runway is ${runway} day(s); need at least ${MIN_RUNWAY}`)

if (errors.length > 0) {
  for (const e of errors) console.error(`FAIL ${e}`)
  process.exit(1)
}
console.log(`validate: ${paintings.size} paintings, ${Object.keys(schedule).length} scheduled days, runway ${runway}. Clean.`)
