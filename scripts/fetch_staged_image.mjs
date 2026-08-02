// Mirror the verified Commons image for one or more candidate ids into
// pipeline/staged/img, at the committed size (1600px longest edge, WebP q80).
//
// The filename is not guessed: it comes from the P18 image claim recorded by
// scripts/wikidata_probe.mjs, so the file is the one Wikidata attaches to that
// painting. Prints the exact image block to paste into the painting JSON.
//
//   node scripts/fetch_staged_image.mjs the-astronomer the-jewish-bride
//   node scripts/fetch_staged_image.mjs --batch 25
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import sharp from 'sharp'

const UA = { 'User-Agent': 'canon-authoring/4.0 (personal art study app; contact: repo charlieSAX/canon)' }
const API = 'https://commons.wikimedia.org/w/api.php'
const STAGED_IMG = 'pipeline/staged/img'
const briefs = JSON.parse(readFileSync('pipeline/briefs-v4.json', 'utf8'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const args = process.argv.slice(2)
let ids = args.filter((a) => !a.startsWith('--'))
const batchFlag = args.indexOf('--batch')
if (batchFlag !== -1) {
  const count = Number.parseInt(args[batchFlag + 1] ?? '25', 10)
  ids = Object.entries(briefs)
    .filter(([id, brief]) => brief.usable && !existsSync(`public/content/paintings/${id}.json`))
    .slice(0, count)
    .map(([id]) => id)
}

if (ids.length === 0) {
  console.error('usage: node scripts/fetch_staged_image.mjs <id...> | --batch <n>')
  process.exit(1)
}

mkdirSync(STAGED_IMG, { recursive: true })

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, { headers: UA })
    if (res.status === 429 || res.status >= 500) {
      await sleep(10000 * (attempt + 1))
      continue
    }
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }
  throw new Error('API failed after retries')
}

const results = {}
for (const id of ids) {
  const brief = briefs[id]
  if (!brief?.commons_image) {
    console.log(`SKIP ${id}: no verified Commons image in the brief`)
    continue
  }
  if (existsSync(`${STAGED_IMG}/${id}.webp`)) {
    const have = await sharp(`${STAGED_IMG}/${id}.webp`).metadata()
    results[id] = {
      src: `img/${id}.webp`,
      width: have.width,
      height: have.height,
      source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(brief.commons_image.replaceAll(' ', '_'))}`,
      license_note: 'Public domain. Faithful reproduction of a public domain work of art.'
    }
    console.log(`HAVE ${id} (${have.width}x${have.height})`)
    continue
  }
  const fileTitle = `File:${brief.commons_image}`
  try {
    const info = await api({
      action: 'query',
      titles: fileTitle,
      prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: '2400'
    })
    const page = Object.values(info.query.pages)[0]
    const ii = page?.imageinfo?.[0]
    if (!ii) throw new Error('no imageinfo')
    if (!/image\/(jpeg|png|tiff)/.test(ii.mime)) throw new Error(`unsupported mime ${ii.mime}`)

    const temp = `${STAGED_IMG}/${id}.original`
    let downloaded = false
    let lastStatus = 'none'
    // upload.wikimedia.org rate limits in bursts, so back off rather than
    // giving up on the first refusal.
    outer: for (const url of [...new Set([ii.thumburl, ii.url].filter(Boolean))]) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const res = await fetch(url, { headers: UA })
          lastStatus = res.status
          if (res.status === 429 || res.status >= 500) {
            await sleep(8000 * (attempt + 1))
            continue
          }
          if (!res.ok) break
          writeFileSync(temp, Buffer.from(await res.arrayBuffer()))
          downloaded = true
          break outer
        } catch (err) {
          lastStatus = err.message
          await sleep(5000 * (attempt + 1))
        }
      }
    }
    if (!downloaded) throw new Error(`download failed (last status ${lastStatus})`)

    const image = sharp(temp, { limitInputPixels: false })
    const meta = await image.metadata()
    const landscape = (meta.width ?? 0) >= (meta.height ?? 0)
    await image
      .resize(landscape ? { width: Math.min(1600, meta.width) } : { height: Math.min(1600, meta.height) })
      .webp({ quality: 80 })
      .toFile(`${STAGED_IMG}/${id}.webp`)
    unlinkSync(temp)
    const out = await sharp(`${STAGED_IMG}/${id}.webp`).metadata()

    results[id] = {
      src: `img/${id}.webp`,
      width: out.width,
      height: out.height,
      source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(brief.commons_image.replaceAll(' ', '_'))}`,
      license_note: 'Public domain. Faithful reproduction of a public domain work of art.'
    }
    console.log(`OK ${id} (${out.width}x${out.height})`)
  } catch (err) {
    console.log(`MISS ${id}: ${err.message}`)
  }
  await sleep(1200)
}

writeFileSync('pipeline/staged-images.json', `${JSON.stringify(results, null, 2)}\n`)
console.log(`\nimage blocks written to pipeline/staged-images.json for ${Object.keys(results).length} painting(s)`)
