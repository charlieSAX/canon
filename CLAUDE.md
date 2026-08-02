# CANON

Stack: Vite + React + TypeScript PWA, Dexie for all user state, ts-fsrs for scheduling, hand-rolled CSS, no router. Static site on GitHub Pages at https://charliesax.github.io/canon/.

Definition of shipped: `npm run verify:live` passing against the deployed Pages URL. Localhost passing counts for nothing.

Rules:

- British English throughout, in prose, UI strings and content JSON alike.
- The dash family U+2012, U+2013, U+2014, U+2015 and U+2212 is banned everywhere. The only accepted check is the Python scan: `python3 scripts/dash_scan.py`. Never trust a shell grep for this.
- No features beyond BRIEF.md. Mid-build ideas go to IDEAS.md, not into the product.
- All user state lives in Dexie (IndexedDB). No localStorage, ever.
- Dates are device-local YYYY-MM-DD strings built from getFullYear/getMonth/getDate. toISOString is banned for dates.
- Do not hand-roll spaced repetition; ts-fsrs owns scheduling.
- The v3 amendments at the end of BRIEF.md supersede the v1 authoring rules: the live pool is 100 paintings, every painting and movement is fully bilingual, and teaching text is authored in-build with "draft": false.
- Painting ids never change. Existing seen rows, cards, completed days, points and tokens must survive every content expansion untouched.
- English and Spanish scene, craft and painter sections contain 40 to 60 words. Points contain 15 to 40 words. Each painting has 2 to 4 notables of 8 to 30 words in both languages.
- `npm run schedule` maintains a 14-day runway. CI requires at least seven days; the nightly issue workflow remains the backstop.
- Scheduling runs in passes: nothing returns until the pool is exhausted, and each day's five are a date-seeded shuffle of the paintings rested 17 days or more. Never restore an alphabetical tie-break; it froze the pool into 20 identical galleries (recorded 2026-08-01). Days already served are frozen, `CANON_REBUILD=1` redeals only the days after today, `CANON_REBUILD=today` also redeals today and rests whatever it displaces, and validate rejects a future day that repeats an earlier day's five.

- Painting facts are sourced, never remembered: run the Wikidata probe and the brief repair, then author only from a brief. A candidate with no verified brief does not get written.
- The library grows through `pipeline/staged` plus `scripts/promote_batch.mjs`. The Monday growth workflow promotes staged batches and otherwise opens an issue; it never authors content.

- The evening letter must stay true: every claim in it is computed from the schedule and the painting's own notables. Never write flavour text that asserts something the content does not support.

Gotchas:

- Reference assets via import.meta.env.BASE_URL (or %BASE_URL% in index.html); the site lives at the /canon/ subpath and absolute / paths 404 on Pages (recorded 2026-07-10).
- Google Fonts serves Cormorant Garamond as a single variable woff2; one @font-face with a weight range covers 400 and 600 (recorded 2026-07-10).
- macOS sips reads WebP but cannot write it; use scripts/mirror.mjs (sharp) for image conversion (recorded 2026-07-10).
- validate applies the 40 to 60 word band to the SPANISH text too, not just English, which is tighter than CONTENT-SPEC implies (recorded 2026-08-02).
- Wikidata resolves famous titles to secondary versions (Potato Eaters to the Kroller-Muller canvas, The Nightmare to the Frankfurt one) and its P2048 dimensions carry units the plain wdt shortcut drops (recorded 2026-08-02).
- GitHub cron is UTC only, so the evening letter runs at 19:00 and 20:00 UTC with a local-hour guard to hold 21:00 Barcelona across daylight saving (recorded 2026-08-02).
- At 100 paintings, content JSON stays precached while images use the `canon-images` runtime cache-first cache (recorded 2026-07-10).
