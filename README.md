# CANON

A private daily art study PWA. Five paintings a day from the 1001 Paintings canon, a spaced-repetition quiz, streaks. One user, no backend, no accounts. Live at https://charliesax.github.io/canon/.

The brief is BRIEF.md and it is law. Ideas go to IDEAS.md.

## The weekly editorial batch routine

1. Open a fresh editorial session and pick the next batch of paintings (five to ten).
2. For each painting, rewrite `text.scene`, `text.craft` and `text.painter` in `public/content/paintings/{id}.json` (50 to 60 words each), sharpen `fact`, and set `"draft": false`.
3. Extend the schedule (below) so the runway stays ahead of the nightly check.
4. Run `npm run validate` and `python3 scripts/dash_scan.py`, then commit and push to main. The push deploys.

## How to add a painting

1. Find the painting on Wikimedia Commons and download the highest-quality file.
2. Convert it: `node scripts/mirror.mjs <downloaded-file> <new-id>`. This writes `public/img/<new-id>.webp` at 1600px longest edge, quality 80, and prints the width and height.
3. Create `public/content/paintings/<new-id>.json`. Copy an existing file for the shape. Record the Commons file page URL as `image.source_url` and the licence as `image.license_note`. Set `"draft": true` until the essay is written.
4. Add the id to a date in `public/content/schedule.json`.
5. `npm run validate`, commit, push.

## How to extend the schedule

`public/content/schedule.json` maps `"YYYY-MM-DD"` to an array of five painting ids. Add more dated entries. Dates with no entry show the closed gallery. A nightly GitHub Action opens a `runway` issue when fewer than 7 scheduled days remain.

## Export and import user state

All progress lives on the device, in the browser. In the app: tap the small frame icon top right to open the progress view.

- **Export progress** downloads a JSON file of everything (seen paintings, completed days, quiz cards, points, freeze tokens).
- **Import progress** takes such a file and replaces the progress on the current device. Use this pair to move between phones or before clearing a browser.

## Enabling GitHub Pages (one-time)

If the site ever needs re-enabling: open https://github.com/charlieSAX/canon on github.com, click Settings, click Pages in the left sidebar, under Source choose "GitHub Actions". Expected outcome: the next run of the Deploy workflow publishes the site at https://charliesax.github.io/canon/.

## Verification

`npm run verify:live` drives the deployed site at a phone-sized viewport and checks the whole critical path. It passing against Pages is the definition of shipped. `CANON_URL=<url> npm run verify:live` points it elsewhere.
