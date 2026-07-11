# CANON build brief v2

## What this is

A private, personal daily art study PWA for one user (Charlie). Each day serves 5 paintings from the "1001 Paintings You Must See Before You Die" canon, each with a short essay. A quiz mode drills previously seen paintings using spaced repetition. Streaks and points sustain the habit. Static site, GitHub Pages, zero backend.

v1 ships from a committed 10-painting seed pack. The 1001-list content pipeline is Phase 2 and is off the critical path. Nothing in v1 touches an external API at deploy or run time; the only network act is the one-time download of 10 Wikimedia Commons images during authoring.

## What this must NOT be

No accounts. No settings screen. No light mode. No notifications. No analytics. No social anything. No features beyond this brief. If a feature idea occurs mid-build, write it to IDEAS.md and move on.

## Locked stack (no choices left)

- Vite + React + TypeScript. Mirrors the Tinta pattern.
- vite-plugin-pwa, generateSW strategy, registerType autoUpdate.
- Dexie for IndexedDB. ALL user state lives here. No localStorage.
- ts-fsrs for scheduling. Do not hand-roll a scheduler.
- Hand-rolled CSS with custom properties. No Tailwind, no component libraries, no framer-motion. CSS transitions only.
- No router. View state in React state: 'daily' | 'quiz' | 'progress'. This kills the Pages deep-link 404 problem outright.
- Node 20, npm.

## GitHub Pages subpath (the classic first-time killer)

Repo `canon`, served at `https://<user>.github.io/canon/`.

- vite.config.ts: `base: '/canon/'`.
- manifest: `start_url: '/canon/'`, `scope: '/canon/'`, `id: '/canon/'`.
- Reference assets via `import.meta.env.BASE_URL`, never absolute `/` paths.
- vite-plugin-pwa inherits scope from base; verify sw.js registers at the subpath on the deployed site, not just localhost.
- `<meta name="robots" content="noindex">` in index.html.

One manual step exists for Charlie: enabling Pages. If the agent cannot do it via gh CLI, print these exact steps and pause: open the repo on github.com, click Settings, click Pages in the left sidebar, under Source choose "GitHub Actions". Expected outcome: the deploy workflow's next run publishes the site.

## Build order (harness first, do not skip)

1. HARNESS: Las Meninas end to end ON THE DEPLOYED SITE: JSON file, daily card renders, card opens, one quiz question answers, streak increments. Get the deploy green first and keep it green.
2. Live verification script (see Verification).
3. Full daily view (5 paintings).
4. Quiz mode with ts-fsrs.
5. Streaks, points, collections.
6. PWA polish, offline, CI, seed pack completion.

## Seed pack (commit these 10; all public domain; images from Wikimedia Commons)

1. Las Meninas, Diego Velázquez, 1656 (harness painting)
2. The Arnolfini Portrait, Jan van Eyck, 1434
3. The Garden of Earthly Delights, Hieronymus Bosch, c.1500
4. The Ambassadors, Hans Holbein the Younger, 1533
5. The Night Watch, Rembrandt van Rijn, 1642
6. Girl with a Pearl Earring, Johannes Vermeer, c.1665
7. Wanderer above the Sea of Fog, Caspar David Friedrich, c.1818
8. Liberty Leading the People, Eugène Delacroix, 1830
9. Olympia, Édouard Manet, 1863
10. The Kiss, Gustav Klimt, 1908

For each: download the highest-quality Commons file, convert to WebP at 1600px longest edge, quality 80, into `/public/img/{id}.webp`. Record the Commons file page URL as source_url and the licence as license_note.

Essay text: the build agent writes functional placeholder essays and sets `"draft": true`. Draft paintings render with a single small dot marker on the card. Final essays are written by Charlie in separate editorial sessions; the builder never ships final prose.

Schedule: 2 days starting from the deploy date, 5 paintings each. Any date with no entry shows a graceful "gallery closed" state.

## Content model

`/content/paintings/{id}.json`:

- id (kebab-case slug), title, artist, year (integer), movement, medium, dimensions, location (museum, city)
- image: { src, width, height, source_url, license_note }
- text: { scene, craft, painter } (each 50 to 60 words), draft (boolean)
- fact: one arresting standalone fact (feeds the quiz)
- tags: [movement, subject, century]

There is NO distractors field. Distractors are sampled at runtime from the seen pool (see Quiz). `/content/schedule.json` maps `"YYYY-MM-DD"` to an array of five ids.

## Dates, completion, streaks (exact rules, no interpretation)

- "Today" is the device-local date. Build the YYYY-MM-DD string from local getFullYear, getMonth, getDate. NEVER use toISOString for dates; it is UTC and silently breaks every evening.
- A painting is "viewed" the first time its info card is opened that day.
- A day is complete when all 5 scheduled paintings are viewed. Record completion once, keyed by the date string.
- Streak: the count of consecutive completed local dates ending today or yesterday. On app load, compute missed days between the last completed date and today. Each missed day consumes one freeze token if held; when tokens run out, streak resets to 0. Today itself never consumes a token.
- Freeze tokens: earn 1 per 10 total completed days, hold a maximum of 2, auto-applied oldest gap first.

## Quiz ("The Test")

- Unlocks at `min(15, total paintings in content)` seen. With the seed pack that is 10, so it unlocks in v1.
- Session: 8 questions. Due FSRS cards first (due <= now), then fill with the soonest-due upcoming cards.
- Question types, rotated: title to painting (4-up image grid); painting to artist (4 text options); fact to painting (4-up grid); place 3 paintings in chronological order.
- Distractors: sample 3 from the seen pool, preferring same century or movement when at least 3 such candidates exist, otherwise uniform random. Never include the correct answer twice.
- Grading maps to the ts-fsrs Rating enum: wrong answer = Again; correct in over 10 seconds = Hard; correct in 3 to 10 seconds = Good; correct in under 3 seconds = Easy.
- One FSRS card per painting, created in Dexie when the painting is first seen.

## Points and collections

- 10 points per painting on its first view of the day.
- Quiz: a correct answer scores 5 + min(15, current interval in days).
- Streak multiplier: 1 + (streak / 100), capped at 2.0, applied at award time, rounded to the nearest integer.
- Collections: completeness by artist, movement, and century over the seen pool. Milestone toast when a set completes ("Every Vermeer, seen.").
- All gamification lives behind one small icon, top right, which opens the progress view. The progress view also holds the JSON export and import buttons for all user state. The home screen is paintings only.

## Daily view

- Vertical scroll-snap, one painting per viewport. Full-bleed image, centred, letterboxed on #0d0d0d.
- Overlay bottom-left: title, artist, year in small metadata type.
- Tap anywhere: a card slides up over the lower half with The Scene, The Craft, The Painter, then the fact. The painting stays visible above.
- Five small progress dots at the top. Nothing else on screen.

## Design doctrine ("the painting is the interface")

- Dark only. Background #0d0d0d. Text warm off-white (#ece8e1).
- Titles: Cormorant Garamond, self-hosted woff2 in /public/fonts with @font-face. No external font requests, ever.
- Metadata: system sans stack, small, uppercase, generous letterspacing.
- No visible buttons where a gesture will do. No borders, no card shadows, no rounded-rectangle app aesthetic. Gallery wall label, not dashboard.
- Motion: fades of 300 to 400ms, gentle ease on the card slide. Nothing bouncy.
- Read /mnt/skills/public/frontend-design/SKILL.md if present; this section wins any conflict.

## PWA and iOS specifics

- Precache the entire app shell, all content JSON, and all seed images (a few MB at 10 paintings, acceptable). At 50+ paintings, move /img/ to runtime cache-first; leave a TODO comment marking this switch.
- Manifest icons at 192 and 512 (maskable), apple-touch-icon at 180px, theme-color #0d0d0d, display standalone.
- Call `navigator.storage.persist()` after the first day completion, to resist iOS storage eviction.
- Everything works offline after first load, including the quiz.

## Verification (defines shipped)

`npm run verify:live` runs a Playwright script against the DEPLOYED Pages URL at a phone-sized viewport (390x844):

1. Page loads and today's first painting image renders (naturalWidth > 0).
2. Card opens on tap; all three text sections and the fact are present.
3. Opening all 5 cards records completion and the streak shows 1. Use a fresh browser context. A test hook `window.__canonSetDate('YYYY-MM-DD')` exists only when the URL carries `?test=1`, so the script can pin the date deterministically.
4. The quiz answers one question and the stored FSRS card's due date changes.

On the first failing step: capture a screenshot and stop. The product is shipped when this passes against Pages. Localhost passing counts for nothing.

## CI and Actions

Deploy workflow, on push to main:

- permissions: contents read, pages write, id-token write.
- Steps: checkout, setup-node 20, npm ci, npm run validate, npm run build, upload-pages-artifact, deploy-pages.

Validate script (Node, runs in CI and locally):

- Every scheduled id resolves to a painting JSON file AND an existing image file.
- No duplicate ids. All text fields non-empty (draft true is allowed in v1).
- Schedule runway of at least 2 days for v1 (raise to 7 when the pipeline lands).

Dash scan (separate CI step, Python, per standing rule; never a shell grep): see `scripts/dash_scan.py`, which holds the exact scan from this brief.

Runway cron workflow: schedule `5 22 * * *` (UTC; lands near 00:05 Barcelona, DST drift is acceptable). Permissions: issues write, contents read. If runway is under 7 days, open an issue labelled `runway`, after first checking that no open `runway` issue already exists. That is its only job.

## Repo hygiene

- CLAUDE.md at repo root stating: British English throughout; banned dash family U+2012, U+2013, U+2014, U+2015, U+2212 with the Python scan as the only accepted check; no features beyond BRIEF.md; verify:live passing against Pages defines shipped.
- This brief committed as BRIEF.md. Mid-build feature ideas go to IDEAS.md, not into the product.
- README documents: the weekly editorial batch routine, how to add a painting, how to extend the schedule, how to export and import user state, and the Pages enablement steps.

## Phase 2 (specified now, built later, NOT in v1 done)

The 1001-list pipeline, four scripts in /scripts:

1. fetch_list: ingest a community-compiled index of the book (title, artist, year, normalised to CSV). Charlie owns the physical book; the list is an index only.
2. resolve: Wikidata SPARQL and Wikimedia Commons first, then Met Open Access, AIC, and Rijksmuseum APIs, with WikiArt as the 20th-century fallback. Emit skeleton JSON with verified metadata. Flag unresolved entries for manual handling.
3. mirror: download, WebP at 1600px quality 80, into /public/img/, keeping source_url.
4. Extend validate: runway of at least 7 days, licence note present on every painting. Skeletons only. Essays are never auto-generated.

## Definition of done (v1)

- verify:live passes against the deployed Pages URL.
- The PWA installs to an iOS home screen and a full day completes offline after first load.
- 10 seed paintings live with draft essays, 2 days scheduled, gallery-closed state beyond.
- Quiz unlocked and functional once the seed pool is seen.
- CI green end to end: validate, dash scan, build, deploy, runway cron in place.
- README, CLAUDE.md, BRIEF.md, IDEAS.md all present.

## v3 amendments (commissioned 2026-07-10, supersede conflicting v2 lines)

Charlie's rulings: 100-painting pool, everything bilingual, weekly scheduler cron.

1. **Bilingual.** The app toggles between English and Spanish from a small control top right on the home screen, next to the progress icon. The choice persists in Dexie. Everything toggles: UI strings, essays, facts, notables, quiz questions. This is the only new control on the home screen.
2. **Pool of 100.** The seed grows to 100 public-domain paintings (public domain in BOTH the EU, life plus 70, and the US, published before 1930). Same image rules as v2: Commons source, WebP 1600px longest edge quality 80, source_url and license_note recorded.
3. **Content model v2.** Per painting, in both languages: scene, craft, painter (a biographical moment around the making, plus a reliably attested remark where one exists), point (what the painting is about, in one or two sentences), notables (2 to 4 short items surfacing hidden or secret details worth hunting for), fact. Movements get a shared two-language explainer in /content/movements.json, shown on the card as The Style. Lengths at or slightly under the v1 band; essays are teaching text now, authored in-build against this spec, not placeholders.
4. **Quiz drills the written content.** New rotated question types alongside the v1 four: the point of the painting (image to point, 4 options), the style (image to movement, 4 options), notable to painting (4-up grid). Same FSRS card per painting, same timing bands, same distractor rules.
5. **Weekly self-scheduling.** A Monday cron keeps at least 14 days of schedule runway: never-scheduled paintings first, then least-recently-scheduled recycling, five per day, committed to main so the push deploys. validate's minimum runway rises to 7 days. The nightly runway-issue check stays as backstop.
6. **Images at scale.** /img/ moves to a runtime cache-first strategy; the shell and all content JSON stay precached. Days already loaded keep working offline.
7. **User state survives.** Painting ids are stable; seen, cards, days, points and tokens carry over untouched.
