// Promote authored paintings from pipeline/staged into the live pool.
//
// This is the only automatic way the library grows. A cron can run it, but it
// can only promote work that already exists: sourcing a public domain image,
// verifying a museum and a date, and writing bilingual teaching text is
// authoring, not scheduling. Staging is the queue between the two.
//
// Layout:
//   pipeline/staged/{id}.json      the painting, same schema as the live pool
//   pipeline/staged/img/{id}.webp  its image, 1600px longest edge
//
// Every promotion is validated as a set. If validation fails, the whole batch
// is rolled back and nothing reaches the live pool.
import { readFileSync, readdirSync, existsSync, copyFileSync, rmSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const STAGED = 'pipeline/staged'
const CONTENT = 'public/content/paintings'
const IMG = 'public/img'

const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : Infinity

if (!existsSync(STAGED)) {
  console.log('promote: no staging directory, nothing to do.')
  process.exit(0)
}

const ids = readdirSync(STAGED)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -5))
  .sort()
  .slice(0, limit)

if (ids.length === 0) {
  console.log('promote: staging is empty, nothing to do.')
  process.exit(0)
}

const written = []
try {
  for (const id of ids) {
    if (existsSync(`${CONTENT}/${id}.json`)) throw new Error(`${id} is already live`)
    const image = `${STAGED}/img/${id}.webp`
    if (!existsSync(image)) throw new Error(`${id} has no staged image at ${image}`)
    mkdirSync(IMG, { recursive: true })
    copyFileSync(image, `${IMG}/${id}.webp`)
    copyFileSync(`${STAGED}/${id}.json`, `${CONTENT}/${id}.json`)
    written.push(id)
  }

  // index.json has to list the new ids before validation will pass.
  execFileSync('node', ['scripts/schedule.mjs'], { stdio: 'inherit' })
  execFileSync('node', ['scripts/validate.mjs'], { stdio: 'inherit' })
  execFileSync('python3', ['scripts/dash_scan.py'], { stdio: 'inherit' })
} catch (err) {
  for (const id of written) {
    rmSync(`${CONTENT}/${id}.json`, { force: true })
    rmSync(`${IMG}/${id}.webp`, { force: true })
  }
  // Put index.json back in step with the rolled back pool.
  try {
    execFileSync('node', ['scripts/schedule.mjs'], { stdio: 'inherit' })
  } catch {
    // the rebuild is best effort; validation below is the real gate
  }
  console.error(`promote: FAILED, rolled back ${written.length} painting(s): ${err.message}`)
  process.exit(1)
}

for (const id of written) {
  rmSync(`${STAGED}/${id}.json`, { force: true })
  rmSync(`${STAGED}/img/${id}.webp`, { force: true })
}

const poolSize = readdirSync(CONTENT).filter((f) => f.endsWith('.json')).length
console.log(`promote: ${written.length} painting(s) live. Pool is now ${poolSize}, cycle ${Math.ceil(poolSize / 5)} days.`)
console.log(written.join('\n'))
