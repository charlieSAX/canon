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

Gotchas:

- Reference assets via import.meta.env.BASE_URL (or %BASE_URL% in index.html); the site lives at the /canon/ subpath and absolute / paths 404 on Pages (recorded 2026-07-10).
- Google Fonts serves Cormorant Garamond as a single variable woff2; one @font-face with a weight range covers 400 and 600 (recorded 2026-07-10).
- macOS sips reads WebP but cannot write it; use scripts/mirror.mjs (sharp) for image conversion (recorded 2026-07-10).
- At 100 paintings, content JSON stays precached while images use the `canon-images` runtime cache-first cache (recorded 2026-07-10).
