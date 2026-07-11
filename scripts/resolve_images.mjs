// Phase 2 resolve + mirror: find each master-list painting on Wikimedia
// Commons, download a large derivative politely, convert to the committed
// WebP (1600px longest edge, q80) and record provenance in
// pipeline/resolved.json. Idempotent: entries with an existing WebP and
// resolved record are skipped, so the run can resume after interruption.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import sharp from 'sharp'

const UA = { 'User-Agent': 'canon-authoring/2.0 (personal art study app; contact: repo charlieSAX/canon)' }
const API = 'https://commons.wikimedia.org/w/api.php'
const master = JSON.parse(readFileSync('pipeline/master-list.json', 'utf8'))
const resolvedPath = 'pipeline/resolved.json'
const resolved = existsSync(resolvedPath) ? JSON.parse(readFileSync(resolvedPath, 'utf8')) : {}
mkdirSync('pipeline/originals', { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, { headers: UA })
    if (res.status === 429) {
      await sleep(30000)
      continue
    }
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }
  throw new Error('API rate limited after retries')
}

const BAD = /detail|cropp|crop\)|frame|copy |after |workshop|follower|study|sketch|x-ray|xray|infrared|verso|reverse|niedersächsisch|печать|stamp|banknote|replica/i
const BANNED_DASHES = /[\u2012\u2013\u2014\u2015\u2212]/g

function scoreTitle(title, entry) {
  let s = 0
  if (/google art project|google cultural/i.test(title)) s += 5
  const surname = entry.artist.split(' ').slice(-1)[0]
  if (title.toLowerCase().includes(surname.toLowerCase())) s += 2
  if (title.toLowerCase().includes(entry.museum.split(' ').slice(-1)[0].toLowerCase())) s += 1
  if (BAD.test(title)) s -= 10
  if (/\.jpe?g$/i.test(title)) s += 1
  return s
}

const overrides = existsSync('pipeline/overrides.json')
  ? JSON.parse(readFileSync('pipeline/overrides.json', 'utf8'))
  : {}

async function resolveOne(entry) {
  let ranked
  if (overrides[entry.id]) {
    ranked = [{ title: overrides[entry.id], score: 100 }]
  } else {
    const search = await api({
      action: 'query',
      list: 'search',
      srnamespace: '6',
      srlimit: '10',
      srsearch: entry.search
    })
    const hits = search?.query?.search ?? []
    if (hits.length === 0) return { miss: 'no search results' }
    ranked = hits
      .map((h) => ({ title: h.title, score: scoreTitle(h.title, entry) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }

  let best = null
  for (const cand of ranked) {
    const info = await api({
      action: 'query',
      titles: cand.title,
      prop: 'imageinfo',
      iiprop: 'url|size|mime',
      iiurlwidth: '2400'
    })
    const page = Object.values(info.query.pages)[0]
    const ii = page?.imageinfo?.[0]
    if (!ii || !/image\/(jpeg|png)/.test(ii.mime)) continue
    if (Math.max(ii.width, ii.height) < 1200) continue
    const area = ii.width * ii.height
    if (!best || cand.score > best.score || (cand.score === best.score && area > best.area)) {
      best = { title: cand.title, score: cand.score, area, ii }
    }
    await sleep(400)
  }
  if (!best) return { miss: 'no usable file among candidates' }

  const src = `pipeline/originals/${entry.id}.img`
  let downloaded = false
  const downloadUrls = [...new Set([best.ii.thumburl, best.ii.url].filter(Boolean))]
  for (const downloadUrl of downloadUrls) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await fetch(downloadUrl, { headers: UA })
      if (res.status === 429) {
        await sleep(15000)
        continue
      }
      if (!res.ok) return { miss: `download ${res.status}` }
      writeFileSync(src, Buffer.from(await res.arrayBuffer()))
      downloaded = true
      break
    }
    if (downloaded) break
  }
  if (!downloaded) return { miss: 'download rate limited after retries' }

  const img = sharp(src, { limitInputPixels: false })
  const meta = await img.metadata()
  const landscape = (meta.width ?? 0) >= (meta.height ?? 0)
  await img
    .resize(landscape ? { width: Math.min(1600, meta.width) } : { height: Math.min(1600, meta.height) })
    .webp({ quality: 80 })
    .toFile(`public/img/${entry.id}.webp`)
  const out = await sharp(`public/img/${entry.id}.webp`).metadata()

  return {
    file_title: best.title.replace(BANNED_DASHES, '-'),
    source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(best.title.replaceAll(' ', '_'))}`,
    original_width: best.ii.width,
    original_height: best.ii.height,
    width: out.width,
    height: out.height
  }
}

let ok = 0
let miss = 0
for (const entry of master.new) {
  const resolvedTitle = resolved[entry.id]?.file_title
  const overriddenTitle = overrides[entry.id]?.replace(BANNED_DASHES, '-')
  if (
    resolved[entry.id]?.width &&
    existsSync(`public/img/${entry.id}.webp`) &&
    (!overriddenTitle || overriddenTitle === resolvedTitle)
  ) {
    ok += 1
    continue
  }
  try {
    const result = await resolveOne(entry)
    if (result.miss) {
      miss += 1
      console.log(`MISS ${entry.id}: ${result.miss}`)
      resolved[entry.id] = { miss: result.miss }
    } else {
      ok += 1
      console.log(`OK ${entry.id} <- ${result.file_title} (${result.width}x${result.height})`)
      resolved[entry.id] = result
    }
  } catch (err) {
    miss += 1
    console.log(`MISS ${entry.id}: ${err.message}`)
    resolved[entry.id] = { miss: err.message }
  }
  writeFileSync(resolvedPath, JSON.stringify(resolved, null, 2))
  await sleep(1200)
}
console.log(`done: ${ok} ok, ${miss} miss`)
