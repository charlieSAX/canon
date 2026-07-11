# CANON content spec (v2, bilingual)

You are writing the teaching content for paintings in a daily art-study app. Charlie, the reader, wants to actually learn: what the painting is about, what to look for, the style, and the human story of the artist. British English. This text is authored final content, not placeholder.

## Your job

For each painting id you are assigned, write `public/content/paintings/{id}.json` following the EXACT schema of the template `public/content/paintings/las-meninas.json`. Every text field exists in BOTH English (`en`) and Spanish (`es`).

Read, before writing:
- `public/content/paintings/las-meninas.json` (the schema template and quality bar)
- `pipeline/content-briefs.json` (per-id metadata: titles, artist, year, movement slug, museum, city, and the resolved image provenance: src, width, height, source_url, license_note)
- `public/content/movements.json` (use the given movement slug; the style blurb is shared and already written, so do NOT restate the movement definition in your `painter` or `craft` fields)

## Verify before you write

You have web tools. For each painting, confirm the load-bearing facts (what the picture depicts, the one arresting fact, the notables, the biographical moment) against a reliable source before writing. Do not invent quotations. If you attribute a remark to the artist, it must be one they actually made and you have seen sourced; if you cannot verify a quote, do not include one. Better a true plain sentence than a vivid false one.

## Fields and exact rules

All word counts are for the ENGLISH text. Spanish should say the same thing naturally (it will run a little longer, that is fine).

- `title`: {en, es}. Use the briefs values. Spanish sentence-case (only first word and proper nouns capitalised).
- `medium`: {en, es}. e.g. "Oil on canvas" / "Óleo sobre lienzo"; "Tempera on panel" / "Temple sobre tabla"; "Fresco" / "Fresco"; "Oil and gold leaf on canvas" / "Óleo y pan de oro sobre lienzo".
- `dimensions`: string, e.g. "204 x 273 cm". One value, shared.
- `year`: integer (from briefs).
- `movement`: the slug from briefs (must exist in movements.json).
- `text.en.scene` and `text.es.scene`: 40 to 60 words. What you are looking at. Concrete, visual, present tense.
- `text.en.craft` and `text.es.craft`: 40 to 60 words. The technique and how it works: brushwork, light, composition, materials, the specific move that makes this painting work. This is "what's the technique".
- `text.en.painter` and `text.es.painter`: 40 to 60 words. The artist biographically AROUND this work: what they were doing, where they were in life, what they were after, and a verified remark if one exists. Not a full biography, the moment.
- `text.en.point` and `text.es.point`: 15 to 40 words. The point of the painting: what it is really about, why it matters. One or two sentences. This is "what's the whole point".
- `notables`: array of 2 to 4 items, each {en, es}, each 8 to 30 words (English). Hidden or secret details, or the most notable things to hunt for in the image: the skull, the signature, the reflected figure, the symbol, the joke. Draw attention to what the eye would miss.
- `fact`: {en, es}, 10 to 45 words (English). One arresting standalone fact. Feeds the quiz, so it must be specific and true.
- `draft`: false.
- `tags`: [movement-slug, a subject word, "{n}th century"]. e.g. ["baroque", "still life", "17th century"].
- `image`: copy src, width, height, source_url, license_note verbatim from the brief for this id.

## Hard bans

- No dash from this family anywhere: U+2012, U+2013, U+2014, U+2015, U+2212 (figure dash, en dash, em dash, horizontal bar, minus). Use commas, colons, parentheses, full stops. This is checked by a Python scanner that fails the build.
- No Simplified Chinese, no Pinyin (not relevant here, but the rule stands).
- British spelling (colour, centre, recognise, jewellery).

## Output

Write each file with the Write tool. Valid JSON, 2-space indent. When done, list the ids you wrote and flag any you could not verify well enough to ship.
