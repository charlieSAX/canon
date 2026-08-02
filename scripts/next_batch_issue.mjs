// Compose the body of the library growth issue. Kept out of the workflow YAML
// so it can be run and read locally before it fires unattended.
import { execFileSync } from 'node:child_process'

const status = JSON.parse(execFileSync('node', ['scripts/library_status.mjs', '--json'], { encoding: 'utf8' }))

const lines = []
lines.push(
  `The pool is ${status.pool} paintings, a ${status.cycleDays} day cycle, and this pass is on day ${status.dayInPass} of ${status.cycleDays}. Paintings added now join the next pass rather than waiting a full cycle.`
)
lines.push('')
lines.push(
  `Staging is empty, so the library cannot grow on its own. A scheduled job can promote authored paintings, but it cannot source a public domain image or write verified bilingual teaching text.`
)
lines.push('')
lines.push(
  `${status.queueReadyToAuthor} candidate(s) in \`pipeline/briefs-v4.json\` are resolved against Wikidata, with year, museum, city, dimensions, materials and a Commons image recorded, and each has passed both public domain gates (creator died before 1956, work made before 1930).`
)
lines.push('')
lines.push('## Next batch to author')
lines.push('')
for (const id of status.nextBatch) lines.push(`- [ ] \`${id}\``)
lines.push('')
lines.push('## How')
lines.push('')
lines.push('1. `node scripts/fetch_staged_image.mjs <id...>` mirrors the verified Commons image into `pipeline/staged/img`.')
lines.push('2. Write `pipeline/staged/<id>.json` following `pipeline/CONTENT-SPEC.md`, using the brief for every fact.')
lines.push('3. `node scripts/promote_batch.mjs` validates the batch and promotes it, or rolls all of it back.')
lines.push('')
lines.push(
  'Check the brief before trusting it: Wikidata sometimes matches a secondary version of a famous painting, and museum attributions are occasionally wrong. Where the brief and the museum record disagree, do not author the painting.'
)

console.log(lines.join('\n'))
