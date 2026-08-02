// Repair pass over pipeline/briefs-v4.json.
//
// Two faults show up in raw Wikidata and both would end up printed on a card:
//
// 1. Dimensions carry a unit that the plain wdt: shortcut throws away, so a
//    painting recorded in millimetres reads as centimetres. L'Absinthe came
//    back as 920 x 680 cm. This refetches amount AND unit and converts.
// 2. P131 gives the immediate administrative unit, which is often a borough:
//    the National Gallery lands in "City of Westminster", the Musee d'Orsay in
//    the "7th arrondissement of Paris". Cards want the city a reader knows.
//
// One SPARQL query per 60 paintings, so this is cheap to re-run.
import { readFileSync, writeFileSync } from 'node:fs'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const UA = {
  'User-Agent': 'canon-authoring/4.0 (personal art study app; contact: repo charlieSAX/canon)',
  Accept: 'application/sparql-results+json'
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Unit QID to centimetres.
const TO_CM = {
  Q174728: 1, // centimetre
  Q174789: 0.1, // millimetre
  Q11573: 100, // metre
  Q218593: 2.54 // inch
}

// Boroughs, arrondissements and districts mapped to the city a card should name.
const CITY_FIX = {
  'City of Westminster': 'London',
  'City of London': 'London',
  Camden: 'London',
  Southwark: 'London',
  Bloomsbury: 'London',
  Manhattan: 'New York',
  Brooklyn: 'New York',
  'Upper East Side': 'New York',
  Ueno: 'Tokyo',
  'Ueno-kōen': 'Tokyo',
  'Bezirk Mitte': 'Berlin',
  Mitte: 'Berlin',
  'Museum Island': 'Berlin',
  Charlottenburg: 'Berlin',
  Montmartre: 'Paris',
  'Vatican Museums': 'Vatican City'
}
const ARRONDISSEMENT = /arrondissement of (.+)$/i

const path = 'pipeline/briefs-v4.json'
const briefs = JSON.parse(readFileSync(path, 'utf8'))
const qids = Object.entries(briefs)
  .filter(([, brief]) => brief.qid)
  .map(([id, brief]) => [id, brief.qid])

const query = (batch) => `
SELECT ?item ?height ?hunit ?width ?wunit ?city_en WHERE {
  VALUES ?item { ${batch.map(([, qid]) => `wd:${qid}`).join(' ')} }
  OPTIONAL { ?item p:P2048/psv:P2048 [ wikibase:quantityAmount ?height ; wikibase:quantityUnit ?hunit ] }
  OPTIONAL { ?item p:P2049/psv:P2049 [ wikibase:quantityAmount ?width ; wikibase:quantityUnit ?wunit ] }
  OPTIONAL {
    ?item wdt:P195|wdt:P276 ?museum .
    ?museum wdt:P131* ?city . ?city wdt:P31/wdt:P279* wd:Q515 .
    ?city rdfs:label ?city_en . FILTER(lang(?city_en) = "en")
  }
}`

async function run(batch) {
  const body = new URLSearchParams({ query: query(batch) })
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', headers: UA, body })
      if (res.status === 429 || res.status >= 500) {
        await sleep(15000 * (attempt + 1))
        continue
      }
      if (!res.ok) throw new Error(`SPARQL ${res.status}`)
      return (await res.json()).results.bindings
    } catch (err) {
      if (attempt === 3) throw err
      await sleep(10000 * (attempt + 1))
    }
  }
  return []
}

const value = (row, key) => row[key]?.value ?? null
const unitOf = (row, key) => (value(row, key) ?? '').split('/').pop()

let fixedDims = 0
let fixedCity = 0
for (let i = 0; i < qids.length; i += 60) {
  const batch = qids.slice(i, i + 60)
  const rows = await run(batch)
  const byQid = new Map()
  for (const row of rows) {
    const qid = value(row, 'item')?.split('/').pop()
    if (!qid) continue
    const existing = byQid.get(qid) ?? { cities: new Set() }
    if (value(row, 'height')) {
      existing.height = Number(value(row, 'height'))
      existing.hunit = unitOf(row, 'hunit')
    }
    if (value(row, 'width')) {
      existing.width = Number(value(row, 'width'))
      existing.wunit = unitOf(row, 'wunit')
    }
    if (value(row, 'city_en')) existing.cities.add(value(row, 'city_en'))
    byQid.set(qid, existing)
  }

  for (const [id, qid] of batch) {
    const found = byQid.get(qid)
    const brief = briefs[id]
    if (!found || !brief) continue

    if (found.height && found.width && TO_CM[found.hunit] && TO_CM[found.wunit]) {
      const height = Number((found.height * TO_CM[found.hunit]).toFixed(1))
      const width = Number((found.width * TO_CM[found.wunit]).toFixed(1))
      const before = brief.dimensions_cm
      brief.dimensions_cm = { height, width }
      brief.dimensions_unit_source = found.hunit
      if (!before || before.height !== height || before.width !== width) fixedDims += 1
    } else if (brief.dimensions_cm) {
      // Unknown or mixed units: better no measurement than a wrong one.
      brief.dimensions_cm = null
      brief.dimensions_note = 'unit not resolvable; measure from the museum record before authoring'
      fixedDims += 1
    }

    const candidates = [...found.cities]
    const raw = brief.city
    const mapped = raw && CITY_FIX[raw] ? CITY_FIX[raw] : null
    const arrondissement = raw && ARRONDISSEMENT.exec(raw)
    const resolved =
      mapped ??
      (arrondissement ? arrondissement[1] : null) ??
      (candidates.length > 0 ? candidates[candidates.length - 1] : null) ??
      raw
    if (resolved && resolved !== raw) {
      brief.city_raw = raw
      brief.city = resolved
      fixedCity += 1
    }
  }
  console.log(`repaired batch ${i / 60 + 1} (${batch.length} paintings)`)
  await sleep(2000)
}

writeFileSync(path, `${JSON.stringify(briefs, null, 2)}\n`)
console.log(`done: ${fixedDims} dimension fix(es), ${fixedCity} city fix(es)`)
