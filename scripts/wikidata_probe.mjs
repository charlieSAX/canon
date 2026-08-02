// Resolve every candidate in pipeline/master-list-v4.json against Wikidata and
// record the load-bearing facts: year, museum, city, dimensions, materials, the
// Commons image filename, and the creator's death year for the public domain
// check. Nothing here is written from memory: a candidate that cannot be
// matched to a Wikidata painting by the expected artist is recorded as a miss
// and is never authored.
//
// Queries go through SPARQL, one batch of artists at a time, because the REST
// entity API needs thousands of calls for the same answer and rate limits hard.
//
// Output: pipeline/briefs-v4.json. Idempotent: it writes after every batch and
// skips artists whose candidates are already resolved.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const UA = {
  'User-Agent': 'canon-authoring/4.0 (personal art study app; contact: repo charlieSAX/canon)',
  Accept: 'application/sparql-results+json'
}

// Public domain gates: the EU is life plus 70, the US needs publication before 1930.
const PD_DEATH_BEFORE = 1956
const PD_INCEPTION_BEFORE = 1930
// Prolific artists (Rembrandt, Vermeer, Rubens) blow the SPARQL time limit when
// batched large, so keep queries small.
const ARTISTS_PER_QUERY = 3

const master = JSON.parse(readFileSync('pipeline/master-list-v4.json', 'utf8'))
const outPath = 'pipeline/briefs-v4.json'
const briefs = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function normalise(text) {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|a|an|of|and|le|la|les|el|los|il)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenScore(a, b) {
  const left = new Set(normalise(a).split(' ').filter(Boolean))
  const right = new Set(normalise(b).split(' ').filter(Boolean))
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const token of left) if (right.has(token)) shared += 1
  return shared / Math.max(left.size, right.size)
}

function surname(name) {
  return name.split(' ').filter(Boolean).slice(-1)[0].toLowerCase()
}

// The type of the work is recorded but never filtered on: restricting to
// "instance of painting" silently drops frescoes, altarpieces, triptychs and
// panel works, which is most of the early canon. Requiring an image and a
// creator keeps the result set sane instead.
const query = (artists) => `
SELECT ?item ?label_en ?label_es ?creator_en ?creator_es ?death ?inception ?kind_en
       ?museum_en ?museum_es ?city_en ?held_en ?height ?width ?image ?material_en WHERE {
  VALUES ?cname { ${artists.map((a) => `"${a.replace(/"/g, '')}"@en`).join(' ')} }
  { ?creator rdfs:label ?cname } UNION { ?creator skos:altLabel ?cname }
  ?item wdt:P170 ?creator ; wdt:P18 ?image ; rdfs:label ?label_en .
  FILTER(lang(?label_en) = "en")
  OPTIONAL { ?item wdt:P31 ?kind . ?kind rdfs:label ?kind_en . FILTER(lang(?kind_en) = "en") }
  OPTIONAL { ?item wdt:P276 ?held . ?held rdfs:label ?held_en . FILTER(lang(?held_en) = "en") }
  OPTIONAL { ?item rdfs:label ?label_es . FILTER(lang(?label_es) = "es") }
  OPTIONAL { ?creator rdfs:label ?creator_en . FILTER(lang(?creator_en) = "en") }
  OPTIONAL { ?creator rdfs:label ?creator_es . FILTER(lang(?creator_es) = "es") }
  OPTIONAL { ?creator wdt:P570 ?dd . BIND(YEAR(?dd) AS ?death) }
  OPTIONAL { ?item wdt:P571 ?inc . BIND(YEAR(?inc) AS ?inception) }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item wdt:P2048 ?height }
  OPTIONAL { ?item wdt:P2049 ?width }
  OPTIONAL { ?item wdt:P186 ?material . ?material rdfs:label ?material_en . FILTER(lang(?material_en) = "en") }
  OPTIONAL {
    ?item wdt:P195 ?museum . ?museum rdfs:label ?museum_en . FILTER(lang(?museum_en) = "en")
    OPTIONAL { ?museum rdfs:label ?museum_es . FILTER(lang(?museum_es) = "es") }
    OPTIONAL { ?museum wdt:P131 ?city . ?city rdfs:label ?city_en . FILTER(lang(?city_en) = "en") }
  }
}`

async function runQuery(artists) {
  const body = new URLSearchParams({ query: query(artists) })
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
      // Socket terminations are common on the heavier queries; retry them.
      if (attempt === 3) throw err
      await sleep(10000 * (attempt + 1))
    }
  }
  throw new Error('SPARQL failed after retries')
}

const value = (row, key) => row[key]?.value ?? null

// Fold the row explosion (one row per material, museum, city) into one record
// per painting.
function fold(rows) {
  const byItem = new Map()
  for (const row of rows) {
    const qid = value(row, 'item')?.split('/').pop()
    if (!qid) continue
    if (!byItem.has(qid)) {
      byItem.set(qid, {
        qid,
        label_en: value(row, 'label_en'),
        label_es: value(row, 'label_es'),
        artist: value(row, 'creator_en'),
        artist_es: value(row, 'creator_es'),
        death: value(row, 'death') ? Number(value(row, 'death')) : null,
        inception: value(row, 'inception') ? Number(value(row, 'inception')) : null,
        image: value(row, 'image'),
        height: value(row, 'height') ? Number(value(row, 'height')) : null,
        width: value(row, 'width') ? Number(value(row, 'width')) : null,
        kinds: new Set(),
        museums: new Set(),
        museums_es: new Set(),
        held: new Set(),
        cities: new Set(),
        materials: new Set()
      })
    }
    const record = byItem.get(qid)
    if (value(row, 'kind_en')) record.kinds.add(value(row, 'kind_en'))
    if (value(row, 'held_en')) record.held.add(value(row, 'held_en'))
    if (value(row, 'museum_en')) record.museums.add(value(row, 'museum_en'))
    if (value(row, 'museum_es')) record.museums_es.add(value(row, 'museum_es'))
    if (value(row, 'city_en')) record.cities.add(value(row, 'city_en'))
    if (value(row, 'material_en')) record.materials.add(value(row, 'material_en'))
  }
  return [...byItem.values()]
}

const pending = master.candidates.filter((c) => !briefs[c.id] || briefs[c.id].miss)
const artists = [...new Set(pending.map((c) => c.artist))]
console.log(`probing ${pending.length} candidate(s) across ${artists.length} artist(s)`)

const records = []
for (let i = 0; i < artists.length; i += ARTISTS_PER_QUERY) {
  const slice = artists.slice(i, i + ARTISTS_PER_QUERY)
  try {
    const rows = await runQuery(slice)
    const folded = fold(rows)
    records.push(...folded)
    console.log(`batch ${i / ARTISTS_PER_QUERY + 1}: ${slice.length} artist(s), ${folded.length} painting(s)`)
  } catch (err) {
    console.log(`BATCH FAIL ${slice.join(', ')}: ${err.message}`)
  }
  await sleep(2000)
}

let ok = 0
let miss = 0
for (const candidate of pending) {
  const pool = records.filter(
    (r) => r.artist && r.artist.toLowerCase().includes(surname(candidate.artist))
  )
  const scored = pool
    .map((r) => ({
      record: r,
      score: Math.max(tokenScore(candidate.title_en, r.label_en), tokenScore(candidate.title_en, r.label_es ?? ''))
    }))
    .sort((a, b) => b.score - a.score || (b.record.image ? 1 : 0) - (a.record.image ? 1 : 0))

  const best = scored[0]
  if (!best || best.score < 0.6) {
    briefs[candidate.id] = {
      miss: 'no Wikidata painting matched title and artist',
      best_guesses: scored.slice(0, 3).map((s) => `${s.record.label_en} (${s.score.toFixed(2)})`)
    }
    miss += 1
    console.log(`MISS ${candidate.id}`)
    continue
  }

  const r = best.record
  const pd = {
    creator_death: r.death,
    inception: r.inception,
    eu_ok: r.death !== null && r.death < PD_DEATH_BEFORE,
    us_ok: r.inception !== null && r.inception < PD_INCEPTION_BEFORE
  }
  briefs[candidate.id] = {
    qid: r.qid,
    match_score: Number(best.score.toFixed(2)),
    title_en: candidate.title_en,
    wikidata_label_en: r.label_en,
    wikidata_label_es: r.label_es,
    artist: r.artist ?? candidate.artist,
    artist_es: r.artist_es,
    movement: candidate.movement,
    year: r.inception,
    museum: [...r.museums][0] ?? [...r.held][0] ?? null,
    kind: [...r.kinds][0] ?? null,
    museum_es: [...r.museums_es][0] ?? null,
    museum_alternatives: [...new Set([...r.museums, ...r.held])].slice(1),
    city: [...r.cities][0] ?? null,
    dimensions_cm: r.height && r.width ? { height: r.height, width: r.width } : null,
    materials: [...r.materials],
    commons_image: r.image ? decodeURIComponent(r.image.split('/').pop()).replaceAll('_', ' ') : null,
    pd,
    usable: Boolean(pd.eu_ok && pd.us_ok && r.image && (r.museums.size > 0 || r.held.size > 0))
  }
  ok += 1
  console.log(`OK ${candidate.id} <- ${r.qid} ${r.label_en} (${r.inception ?? '?'}, ${[...r.museums][0] ?? 'no museum'})`)
}

writeFileSync(outPath, `${JSON.stringify(briefs, null, 2)}\n`)
const usable = Object.values(briefs).filter((b) => b.usable).length
console.log(`done: ${ok} resolved, ${miss} missed, ${usable} usable of ${Object.keys(briefs).length}`)
