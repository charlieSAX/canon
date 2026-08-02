// Compose the evening letter: a warm, specific nudge towards tonight's five
// paintings that gives away a detail without giving away the painting.
//
// Everything in the letter is true and drawn from the day's actual content:
// the teased detail is one of that painting's own notables, the absence line
// is measured from the real schedule history, and the places and dates are the
// ones on the cards. Nothing is invented for effect.
//
//   node scripts/evening_email.mjs --preview          write and open a local preview
//   node scripts/evening_email.mjs --out <dir>        write subject.txt, body.html, body.txt, detail.jpg
//   CANON_TODAY=2026-08-05 node scripts/evening_email.mjs --preview
//
// Exit code 20 means the gallery is closed tonight and nothing should be sent.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const CONTENT = 'public/content'
const SITE = 'https://charliesax.github.io/canon/'

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const today = process.env.CANON_TODAY || formatDate(new Date())

// Deterministic per day: the same evening always composes the same letter, so a
// retry never sends a different one.
function seedFrom(text) {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const seed = seedFrom(today)
const pick = (list, salt = 0) => list[(seed + salt * 2654435761) % list.length]

const schedule = JSON.parse(readFileSync(`${CONTENT}/schedule.json`, 'utf8'))
const ids = schedule[today]
if (!Array.isArray(ids) || ids.length === 0) {
  console.error(`evening: the gallery is closed on ${today}; nothing to send.`)
  process.exit(20)
}

const paintings = ids.map((id) => JSON.parse(readFileSync(`${CONTENT}/paintings/${id}.json`, 'utf8')))
const librarySize = JSON.parse(readFileSync(`${CONTENT}/index.json`, 'utf8')).length

// How long each of tonight's paintings has been out of sight, from the real
// schedule. A painting with no earlier date has never hung here.
const earlier = Object.keys(schedule)
  .filter((date) => date < today)
  .sort()
const lastSeen = new Map()
for (const date of earlier) for (const id of schedule[date]) lastSeen.set(id, date)
const daysAway = (id) => {
  const last = lastSeen.get(id)
  if (!last) return null
  return Math.round((parseDate(today) - parseDate(last)) / 86400000)
}

const debutants = paintings.filter((p) => daysAway(p.id) === null)
const longestAway = paintings
  .map((p) => ({ p, days: daysAway(p.id) }))
  .filter((x) => x.days !== null)
  .sort((a, b) => b.days - a.days)[0]

// The teased painting. Prefer one whose detail keeps its own secret: a notable
// that names the artist or the title tells you which painting it is.
function anonymous(painting) {
  const surname = painting.artist.split(' ').filter(Boolean).slice(-1)[0].toLowerCase()
  const titleWords = painting.title.en
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4)
  return painting.notables.filter((notable) => {
    const text = notable.en.toLowerCase()
    if (text.includes(surname)) return false
    return !titleWords.some((word) => text.includes(word))
  })
}

const withSecrets = paintings.filter((p) => anonymous(p).length > 0)
const teasable = withSecrets.length > 0 ? withSecrets : paintings
const chosen = teasable[seed % teasable.length]
const secrets = anonymous(chosen).length > 0 ? anonymous(chosen) : chosen.notables
const secret = secrets[(seed >>> 8) % secrets.length]

const greetings = [
  'Good evening.',
  'Evening.',
  'It is that hour again.',
  'The light has gone; the wall has not.',
  'Evening, and the gallery is lit.'
]

const settings = [
  'Five are hanging tonight, and they will keep until you are ready.',
  'Five went up this morning and have been waiting all day.',
  'Tonight there are five, hung and quiet.',
  'Five paintings are on the wall, in no hurry at all.',
  'The wall has five on it tonight, and the room is empty.'
]

const framings = [
  'One thing waiting for you, without saying which painting it belongs to:',
  'A detail from one of the five, and no more than that:',
  'Somewhere in tonight&rsquo;s five, this is true:',
  'Here is one thing to go and look for:',
  'Something in a corner you would probably walk past:'
]

const closings = [
  'Take your time. They are not going anywhere.',
  'Five minutes is enough. It usually turns into more.',
  'Go and find it. The rest can wait until tomorrow.',
  'Whenever you like. The room stays open.',
  'It is worth the walk over.'
]

const years = paintings.map((p) => p.year).sort((a, b) => a - b)
const cities = [...new Set(paintings.map((p) => p.location.city))]

function listPhrase(items) {
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

const spanPhrase =
  years[0] === years[years.length - 1]
    ? `All five were painted in ${years[0]}.`
    : `They were painted between ${years[0]} and ${years[years.length - 1]}, and they hang in ${
        cities.length === 1 ? cities[0] : listPhrase(cities)
      }.`

let absenceLine = null
if (debutants.length === 1) {
  absenceLine = 'One of the five has never hung here before. Tonight is its first evening on the wall.'
} else if (debutants.length > 1) {
  absenceLine = `${debutants.length} of tonight's five have never hung here before.`
} else if (longestAway && longestAway.days >= 14) {
  absenceLine = `One of them has been in the dark for ${longestAway.days} days, which is the longest any of tonight's five has been away.`
}

// The specific subjects are worth using only when they are actually unusual.
// A pass hangs everything once, so "away 20 days" is true nearly every night
// and would read as a form letter within a week.
let subject
if (debutants.length === 1) {
  subject = 'Something new is hanging tonight'
} else if (debutants.length > 1) {
  subject = `${debutants.length} paintings you have not seen before`
} else if (longestAway && longestAway.days >= 26) {
  subject = `One of tonight's five has been away ${longestAway.days} days`
} else {
  subject = pick(
    [
      'Five are up, and one of them is hiding something',
      'Tonight, a detail you would walk straight past',
      'The gallery is lit and the room is empty',
      'Something small is waiting on the wall',
      'Five paintings, and a thing to go and find',
      'One of tonight&rsquo;s five keeps a secret',
      'The wall is hung. Nobody else is in the room',
      'A small thing, in the corner of one of them',
      'Tonight: five, and a detail worth the trip',
      'Something is waiting up on the wall'
    ],
    3
  ).replace(/&rsquo;/g, "'")
}

const greeting = pick(greetings, 1)
const setting = pick(settings, 2)
const framing = pick(framings, 4)
const closing = pick(closings, 5)
const preheader = 'A detail from one of tonight&rsquo;s five, without saying which.'

// A crop tight enough to stay a mystery. At 30 per cent of the picture the
// whole central group of a Manet arrives in the inbox and the tease is over,
// so this takes 16 per cent: brushwork, a hand, an edge of cloth.
//
// Several windows are tried and the one with the most tonal variation wins,
// which keeps the crop off flat sky without steering it onto faces.
const CROP_FRACTION = 0.16
const CROP_CANDIDATES = 6

async function makeDetail(outPath) {
  const source = `public/${chosen.image.src}`
  if (!existsSync(source)) return false
  try {
    const meta = await sharp(source).metadata()
    const width = meta.width ?? 0
    const height = meta.height ?? 0
    if (width < 400 || height < 400) return false

    const cropW = Math.round(width * CROP_FRACTION)
    const cropH = Math.round(height * CROP_FRACTION)
    const spanX = Math.max(1, Math.round((width - cropW) * 0.7))
    const spanY = Math.max(1, Math.round((height - cropH) * 0.7))
    const originX = Math.round((width - cropW) * 0.15)
    const originY = Math.round((height - cropH) * 0.15)

    let best = null
    for (let i = 0; i < CROP_CANDIDATES; i += 1) {
      const left = originX + ((seed >>> (3 + i)) * (i + 1)) % spanX
      const top = originY + ((seed >>> (5 + i)) * (i + 2)) % spanY
      const region = { left, top, width: cropW, height: cropH }
      const stats = await sharp(source).extract(region).stats()
      const variation = stats.channels.reduce((sum, c) => sum + c.stdev, 0) / stats.channels.length
      if (!best || variation > best.variation) best = { region, variation }
    }
    if (!best) return false

    await sharp(source)
      .extract(best.region)
      .resize({ width: Math.min(720, cropW * 3) })
      .jpeg({ quality: 84 })
      .toFile(outPath)
    return true
  } catch {
    return false
  }
}

const html = (hasDetail) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0d0d0d;">
<div style="display:none;font-size:1px;color:#0d0d0d;max-height:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;">
<tr><td align="center" style="padding:40px 20px 56px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

<tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a8079;padding-bottom:28px;">Canon</td></tr>

<tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.65;color:#ece8e1;padding-bottom:18px;">${greeting}</td></tr>

<tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.65;color:#ece8e1;padding-bottom:30px;">${setting}</td></tr>

${
  hasDetail
    ? `<tr><td style="padding-bottom:12px;"><img src="cid:detail" width="520" alt="A detail from one of tonight's paintings, cropped too close to place." style="display:block;width:100%;max-width:520px;height:auto;border:0;"></td></tr>
<tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:12px;font-style:italic;color:#8a8079;padding-bottom:30px;">A detail from one of the five, at close range.</td></tr>`
    : ''
}

<tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#8a8079;padding-bottom:12px;">${framing}</td></tr>

<tr><td style="border-left:1px solid #3a3630;padding:2px 0 2px 18px;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.6;color:#ece8e1;">${secret.en}</div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;font-style:italic;color:#8a8079;padding-top:10px;">${secret.es}</div>
</td></tr>

<tr><td style="padding-top:30px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#b9b1a8;">
${absenceLine ? `${absenceLine}<br><br>` : ''}${spanPhrase}
</td></tr>

<tr><td style="padding-top:34px;padding-bottom:34px;">
  <a href="${SITE}" style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#ece8e1;text-decoration:none;border-bottom:1px solid #6f665e;padding-bottom:3px;">Open the gallery</a>
</td></tr>

<tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#8a8079;">${closing}</td></tr>

<tr><td style="padding-top:40px;font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:1.6;color:#4f4a45;">
${paintings.length} paintings tonight, from a library of ${librarySize}. Sent from your own repository, once an evening.
</td></tr>

</table></td></tr></table></body></html>`

const text = [
  greeting,
  '',
  setting,
  '',
  framing.replace(/&rsquo;/g, "'"),
  '',
  `  ${secret.en}`,
  `  ${secret.es}`,
  '',
  absenceLine ?? '',
  spanPhrase,
  '',
  `Open the gallery: ${SITE}`,
  '',
  closing
]
  .filter((line, index, all) => !(line === '' && all[index - 1] === ''))
  .join('\n')

const outFlag = process.argv.indexOf('--out')
const outDir = outFlag !== -1 ? process.argv[outFlag + 1] : null
const preview = process.argv.includes('--preview')

if (outDir) {
  mkdirSync(outDir, { recursive: true })
  const hasDetail = await makeDetail(`${outDir}/detail.jpg`)
  writeFileSync(`${outDir}/subject.txt`, subject)
  writeFileSync(`${outDir}/body.html`, html(hasDetail))
  writeFileSync(`${outDir}/body.txt`, text)
  writeFileSync(`${outDir}/detail.flag`, hasDetail ? '1' : '0')
  console.log(`evening: composed for ${today}, teasing ${chosen.id}${hasDetail ? ' with a detail crop' : ''}`)
  console.log(`subject: ${subject}`)
} else if (preview) {
  mkdirSync('verify-artifacts', { recursive: true })
  const hasDetail = await makeDetail('verify-artifacts/detail.jpg')
  // The preview points at the file on disk so it renders in a browser.
  writeFileSync(
    'verify-artifacts/evening-preview.html',
    html(hasDetail).replace('cid:detail', 'detail.jpg')
  )
  console.log(`subject: ${subject}`)
  console.log(`teasing: ${chosen.id} (${chosen.title.en})`)
  console.log(`detail crop: ${hasDetail ? 'yes' : 'no'}`)
  console.log('')
  console.log(text)
  console.log('')
  console.log('preview: verify-artifacts/evening-preview.html')
} else {
  console.log(subject)
  console.log('')
  console.log(text)
}
