# CANON

A private bilingual daily art study PWA. Five paintings a day from a 100-painting canon, a content-driven spaced-repetition quiz, and streaks. One user, no backend, no accounts. Live at https://charliesax.github.io/canon/.

The brief is BRIEF.md and it is law. Ideas go to IDEAS.md.

## The weekly editorial batch routine

1. Pick the next five to ten entries from `pipeline/master-list.json` and resolve their Commons images and metadata.
2. Author English and Spanish scene, craft and painter sections at 40 to 60 words each, a point at 15 to 40 words, 2 to 4 notables at 8 to 30 words each, and a fact. Set `"draft": false`.
3. Add or confirm the shared bilingual movement explainer in `public/content/movements.json`.
4. Run `npm run schedule`, `npm run validate`, `python3 scripts/dash_scan.py` and `npm run build`.
5. Visually check the new image batch against a labelled contact sheet, record the check in the project log, then commit and push. The push deploys.

## How to add a painting

1. Confirm that the work is public domain in both the EU and US, then find the correct file on Wikimedia Commons.
2. Convert it with `node scripts/mirror.mjs <downloaded-file> <new-id>`. This writes `public/img/<new-id>.webp` at 1600px longest edge, quality 80, and prints its dimensions.
3. Create `public/content/paintings/<new-id>.json` using the current bilingual shape. Record `image.source_url` and `image.license_note`; authored v2 entries use `"draft": false`.
4. Add the stable id to `public/content/index.json`, add any new movement to `public/content/movements.json`, and run `npm run schedule`.
5. Run the full local checks, visually verify the image, commit, and push.

## How to extend the schedule

`public/content/schedule.json` maps local `"YYYY-MM-DD"` dates to five painting ids. `npm run schedule` keeps 14 days available, selecting never-scheduled paintings first and then the least recently shown. A Monday workflow commits extensions automatically. Validation requires seven days; the nightly runway issue remains the backstop.

## Export and import user state

All progress lives on the device, in the browser. In the app: tap the small frame icon top right to open the progress view.

- **Export progress** downloads a JSON file of everything (seen paintings, completed days, quiz cards, points, freeze tokens).
- **Import progress** takes such a file and replaces the progress on the current device. Use this pair to move between phones or before clearing a browser.

## Enabling GitHub Pages (one-time)

If the site ever needs re-enabling: open https://github.com/charlieSAX/canon on github.com, click Settings, click Pages in the left sidebar, under Source choose "GitHub Actions". Expected outcome: the next run of the Deploy workflow publishes the site at https://charliesax.github.io/canon/.

## Verification

`npm run verify:live` drives the deployed site at a phone-sized viewport in both languages, completes a day, and answers an authored-content quiz question. It passing against Pages is the definition of shipped. `CANON_URL=<url> npm run verify:live` points it elsewhere for preflight only; localhost never counts as shipped.
