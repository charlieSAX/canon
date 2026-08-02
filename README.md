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

`public/content/schedule.json` maps local `"YYYY-MM-DD"` dates to five painting ids. `npm run schedule` keeps 14 days available. Selection runs in passes: nothing returns until the whole pool has been hung, which holds the average gap at the pool size divided by five (20 days at 100 paintings). Within a pass the five are drawn by a date-seeded shuffle from the paintings rested at least 17 days, avoiding a repeated artist and more than two of one movement in a day, and preferring paintings whose artist or title did not appear in the previous two days. The shuffle is deterministic, so a rerun of the command changes nothing, and it stops a pass from handing back the same five paintings together the way the old alphabetical rotation did.

Days already served are frozen. To redeal only the days ahead, run `CANON_REBUILD=1 npm run schedule`: it drops every date after today and deals them again, respecting the rest floor against the days already shown. `CANON_REBUILD=today npm run schedule` redeals today as well, and treats the five it displaces as hung today, since they may already have been viewed on the device. Use that one only when today is worth losing: any painting already tapped today keeps its points and its seen row, but the day needs the new five viewed before it completes. A Monday workflow commits extensions automatically. Validation requires seven days, rejects any future day that repeats an earlier day's five, and rejects a painting returning inside 14 days; the nightly runway issue remains the backstop.

## How to grow the library

The pool divided by five is the cycle in days: 116 paintings is a 24 day cycle. Growing the pool is the only way to widen the gap between repeats.

Candidates live in `pipeline/master-list-v4.json`. Nothing is authored from memory:

1. `node scripts/wikidata_probe.mjs` resolves each candidate against Wikidata over SPARQL and writes `pipeline/briefs-v4.json`: year, museum, city, dimensions, materials, the Commons image filename and the creator's death year. A candidate it cannot match to the right artist is a miss and is never authored.
2. `node scripts/repair_briefs.mjs` refetches dimensions with their units and walks museum locations up to a real city. Without it a painting recorded in millimetres reads as centimetres and the National Gallery sits in "City of Westminster".
3. `node scripts/fetch_staged_image.mjs <id...>` mirrors the verified Commons image into `pipeline/staged/img` at 1600px longest edge.
4. Author `pipeline/staged/<id>.json` against `pipeline/CONTENT-SPEC.md`. Note that validation applies the 40 to 60 word band to Spanish as well as English.
5. `node scripts/promote_batch.mjs` promotes the staged batch, validating it as a set and rolling all of it back if any part fails.

Check the brief before trusting it. Wikidata sometimes matches a secondary version of a famous painting, and museum attributions are occasionally wrong. Where the brief and the museum record disagree, do not author the painting.

`node scripts/library_status.mjs` reports where the pool sits in its cycle. The Monday `Library growth` workflow uses it: at the halfway point of a pass it promotes whatever is staged and redeploys, and when staging is empty it opens an issue naming the next verified candidates. It cannot author paintings, so it asks.

## The evening letter

One email a day at 21:00 Barcelona time, composed by `scripts/evening_email.mjs` and sent by `.github/workflows/evening.yml`.

It teases without spoiling: a real detail from one of tonight's five, taken from that painting's own notables and chosen so it does not name the artist or the title, in English and Spanish, above a crop of the picture tight enough to stay a mystery. The rest of the letter is measured from the schedule itself, so the line about how long a painting has been away, or that one has never hung here before, is always true.

Preview any night without sending:

```
node scripts/evening_email.mjs --preview
CANON_TODAY=2026-08-09 node scripts/evening_email.mjs --preview
node scripts/send_evening.mjs /tmp/evening --build
```

GitHub cron only runs on UTC, so the workflow fires at 19:00 and 20:00 UTC and a guard lets through whichever run lands on 21:00 in Europe/Madrid. That survives daylight saving without intervention. Scheduled runs can be delayed by a few minutes under load. If a date has no paintings the composer exits 20 and nothing is sent, since a letter about an empty wall helps nobody; the runway workflow is what raises that alarm.

### Setting it up (one time)

Repository variables, at https://github.com/charlieSAX/canon/settings/variables/actions, "New repository variable":

- `EVENING_TO`: the address that receives the letter.
- `EVENING_FROM`: optional, defaults to the sending mailbox.

Repository secrets, at https://github.com/charlieSAX/canon/settings/secrets/actions, "New repository secret":

- `SMTP_HOST`, for example `smtp.gmail.com`
- `SMTP_PORT`, `465`
- `SMTP_USER`, the mailbox address that sends
- `SMTP_PASS`, an app password, never the account password

For Gmail: switch on 2-Step Verification at https://myaccount.google.com/signinoptions/two-step-verification, then create an app password at https://myaccount.google.com/apppasswords, name it `canon`, and paste the sixteen characters into `SMTP_PASS`. Any other SMTP provider works the same way.

Then run the workflow once from the Actions tab with "Run workflow" and dry run left on. It connects, proves the credentials, and sends nothing.

## Export and import user state

All progress lives on the device, in the browser. In the app: tap the small frame icon top right to open the progress view.

- **Export progress** downloads a JSON file of everything (seen paintings, completed days, quiz cards, points, freeze tokens).
- **Import progress** takes such a file and replaces the progress on the current device. Use this pair to move between phones or before clearing a browser.

## Enabling GitHub Pages (one-time)

If the site ever needs re-enabling: open https://github.com/charlieSAX/canon on github.com, click Settings, click Pages in the left sidebar, under Source choose "GitHub Actions". Expected outcome: the next run of the Deploy workflow publishes the site at https://charliesax.github.io/canon/.

## Verification

`npm run verify:live` drives the deployed site at a phone-sized viewport in both languages, completes a day, and answers an authored-content quiz question. It passing against Pages is the definition of shipped. `CANON_URL=<url> npm run verify:live` points it elsewhere for preflight only; localhost never counts as shipped.
