// Content validation, run locally and in CI before every build.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const errors = []
const CONTENT = 'public/content'
const LANGS = ['en', 'es']

function fail(message) {
  errors.push(message)
}

function words(value) {
  return typeof value === 'string' && value.trim() ? value.trim().split(/\s+/u).length : 0
}

function localised(value, label, id) {
  for (const lang of LANGS) {
    if (typeof value?.[lang] !== 'string' || value[lang].trim() === '') fail(`${id}: empty ${label}.${lang}`)
  }
}

function inBand(value, label, id, min, max) {
  for (const lang of LANGS) {
    const count = words(value?.[lang])
    if (count < min || count > max) fail(`${id}: ${label}.${lang} has ${count} words; need ${min} to ${max}`)
  }
}

const schedule = JSON.parse(readFileSync(path.join(CONTENT, 'schedule.json'), 'utf8'))
const index = JSON.parse(readFileSync(path.join(CONTENT, 'index.json'), 'utf8'))
const movements = JSON.parse(readFileSync(path.join(CONTENT, 'movements.json'), 'utf8'))
const paintingFiles = readdirSync(path.join(CONTENT, 'paintings')).filter((file) => file.endsWith('.json'))
const paintings = new Map()

for (const [slug, movement] of Object.entries(movements)) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(`movement: bad slug "${slug}"`)
  localised(movement.name, 'name', `movement ${slug}`)
  localised(movement.blurb, 'blurb', `movement ${slug}`)
}

for (const file of paintingFiles) {
  const painting = JSON.parse(readFileSync(path.join(CONTENT, 'paintings', file), 'utf8'))
  const id = painting.id ?? file
  if (paintings.has(id)) fail(`duplicate painting id: ${id}`)
  if (id !== path.basename(file, '.json')) fail(`${file}: id "${id}" does not match filename`)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail(`${id}: bad id slug`)
  paintings.set(id, painting)

  localised(painting.title, 'title', id)
  localised(painting.medium, 'medium', id)
  localised(painting.fact, 'fact', id)
  if (typeof painting.artist !== 'string' || painting.artist.trim() === '') fail(`${id}: empty artist`)
  if (!Number.isInteger(painting.year)) fail(`${id}: year must be an integer`)
  if (!movements[painting.movement]) fail(`${id}: unknown movement "${painting.movement}"`)
  if (typeof painting.dimensions !== 'string' || painting.dimensions.trim() === '') fail(`${id}: empty dimensions`)
  for (const field of ['museum', 'city']) {
    if (typeof painting.location?.[field] !== 'string' || painting.location[field].trim() === '')
      fail(`${id}: empty location.${field}`)
  }

  for (const section of ['scene', 'craft', 'painter']) {
    inBand({ en: painting.text?.en?.[section], es: painting.text?.es?.[section] }, `text.${section}`, id, 40, 60)
  }
  inBand({ en: painting.text?.en?.point, es: painting.text?.es?.point }, 'text.point', id, 15, 40)

  if (!Array.isArray(painting.notables) || painting.notables.length < 2 || painting.notables.length > 4) {
    fail(`${id}: notables must contain 2 to 4 items`)
  } else {
    painting.notables.forEach((notable, index) => inBand(notable, `notables[${index}]`, id, 8, 30))
  }

  if (painting.draft !== false) fail(`${id}: v2 teaching text must set draft to false`)
  if (!Array.isArray(painting.tags) || painting.tags.length === 0) fail(`${id}: tags must be a non-empty array`)
  if (typeof painting.image?.source_url !== 'string' || painting.image.source_url.trim() === '')
    fail(`${id}: missing image.source_url`)
  if (typeof painting.image?.license_note !== 'string' || painting.image.license_note.trim() === '')
    fail(`${id}: missing image.license_note`)
  if (!Number.isInteger(painting.image?.width) || !Number.isInteger(painting.image?.height))
    fail(`${id}: image dimensions must be integers`)
  else if (Math.max(painting.image.width, painting.image.height) !== 1600)
    fail(`${id}: image longest edge must be 1600px`)
  if (!existsSync(path.join('public', painting.image?.src ?? ''))) fail(`${id}: image file missing: ${painting.image?.src}`)
}

if (!Array.isArray(index)) {
  fail('index.json must be an array of painting ids')
} else {
  if (new Set(index).size !== index.length) fail('index.json contains duplicate ids')
  for (const id of index) if (!paintings.has(id)) fail(`index.json: unknown painting id "${id}"`)
  for (const id of paintings.keys()) if (!index.includes(id)) fail(`index.json: missing painting id "${id}"`)
}

// Every scheduled day contains five distinct ids that resolve to complete content.
for (const [date, ids] of Object.entries(schedule)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`schedule: bad date key "${date}"`)
  if (!Array.isArray(ids) || ids.length !== 5) fail(`schedule ${date}: must contain exactly five ids`)
  if (Array.isArray(ids) && new Set(ids).size !== ids.length) fail(`schedule ${date}: duplicate id`)
  for (const id of ids ?? []) {
    if (!paintings.has(id)) fail(`schedule ${date}: unknown painting id "${id}"`)
  }
}

// The weekly scheduler keeps 14 days available; seven is the CI backstop.
const MIN_RUNWAY = 7
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const runway = Object.keys(schedule).filter((date) => date >= today).length
if (runway < MIN_RUNWAY) fail(`schedule runway is ${runway} day(s); need at least ${MIN_RUNWAY}`)

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL ${error}`)
  process.exit(1)
}
console.log(`validate: ${paintings.size} paintings, ${Object.keys(schedule).length} scheduled days, runway ${runway}. Clean.`)
