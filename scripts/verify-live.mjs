// Live verification against the DEPLOYED Pages URL. Localhost passing counts
// for nothing. On the first failing step: screenshot, report, exit 1.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import process from 'node:process'

const URL = process.env.CANON_URL ?? 'https://charliesax.github.io/canon/'
const VIEWPORT = { width: 390, height: 844 }

mkdirSync('verify-artifacts', { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: VIEWPORT }) // fresh context, no stored state
const page = await context.newPage()

let step = 'setup'
async function fail(reason) {
  const shot = `verify-artifacts/fail-${step.replaceAll(' ', '-')}.png`
  try {
    await page.screenshot({ path: shot, fullPage: false })
    console.error(`FAIL at step "${step}": ${reason}`)
    console.error(`screenshot: ${shot}`)
  } catch {
    console.error(`FAIL at step "${step}": ${reason} (screenshot unavailable)`)
  }
  await browser.close()
  process.exit(1)
}

try {
  // Pin the app to the first scheduled date so the run is deterministic.
  const schedule = await (await fetch(`${URL}content/schedule.json`)).json()
  const dates = Object.keys(schedule).sort()
  if (dates.length === 0) await fail('schedule.json has no dates')
  const [day1, day2] = dates

  step = '1 first painting renders'
  await page.goto(`${URL}?test=1`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => typeof window.__canonSetDate === 'function', { timeout: 15000 })
  await page.evaluate((d) => window.__canonSetDate(d), day1)
  await page.waitForSelector(`.daily[data-date="${day1}"] img.art`, { timeout: 15000 })
  await page.waitForFunction(
    () => {
      const img = document.querySelector('.slide img.art')
      return img && img.naturalWidth > 0
    },
    { timeout: 20000 }
  )
  console.log('PASS 1: first painting image renders (naturalWidth > 0)')

  step = '2 card opens with all sections'
  await page.locator('.slide').first().click()
  await page.waitForSelector('.card.open', { timeout: 5000 })
  const card = page.locator('.card.open').first()
  for (const label of ['The Scene', 'The Craft', 'The Painter']) {
    if ((await card.locator('h4.label', { hasText: label }).count()) === 0)
      await fail(`card is missing section "${label}"`)
  }
  const factText = await card.locator('.fact').textContent()
  if (!factText || factText.trim().length === 0) await fail('card fact is empty')
  console.log('PASS 2: card opens with The Scene, The Craft, The Painter and the fact')

  step = '3 completing the day sets streak to 1'
  const slideCount = await page.locator('.slide').count()
  for (let i = 0; i < slideCount; i += 1) {
    const slide = page.locator('.slide').nth(i)
    await slide.scrollIntoViewIfNeeded()
    if ((await slide.locator('.card.open').count()) === 0) {
      await slide.click()
      await slide.locator('.card.open').waitFor({ timeout: 5000 })
    }
    await slide.click({ position: { x: 195, y: 80 } }) // close via the painting area
  }
  await page.locator('.corner-btn').click()
  await page.waitForSelector('[data-testid="streak"]', { timeout: 5000 })
  const streak = (await page.locator('[data-testid="streak"]').textContent())?.trim()
  if (streak !== '1') await fail(`streak shows "${streak}", expected "1"`)
  console.log('PASS 3: all cards opened, day completed, streak shows 1')

  step = '4 quiz answer changes the FSRS due date'
  // See day 2 as well so the seen pool reaches the unlock threshold.
  await page.locator('.text-btn.back').click()
  await page.evaluate((d) => window.__canonSetDate(d), day2)
  await page.waitForSelector(`.daily[data-date="${day2}"] img.art`, { timeout: 15000 })
  const slides2 = await page.locator('.slide').count()
  for (let i = 0; i < slides2; i += 1) {
    const slide = page.locator('.slide').nth(i)
    await slide.scrollIntoViewIfNeeded()
    if ((await slide.locator('.card.open').count()) === 0) {
      await slide.click()
      await slide.locator('.card.open').waitFor({ timeout: 5000 })
    }
    await slide.click({ position: { x: 195, y: 80 } })
  }

  const duesBefore = await page.evaluate(async () => {
    const req = indexedDB.open('canon')
    const db = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
    const rows = await new Promise((res, rej) => {
      const tx = db.transaction('cards').objectStore('cards').getAll()
      tx.onsuccess = () => res(tx.result)
      tx.onerror = () => rej(tx.error)
    })
    db.close()
    return Object.fromEntries(rows.map((r) => [r.paintingId, r.due]))
  })

  await page.locator('.corner-btn').click()
  try {
    await page.waitForSelector('button.test-btn', { timeout: 8000 })
  } catch {
    await fail('The Test is not unlocked in the progress view')
  }
  await page.locator('button.test-btn').click()
  await page.waitForSelector('.quiz', { timeout: 5000 })
  // Answer the first question: any tap grades the card and reschedules it.
  const artOption = page.locator('.quiz-art').first()
  const textOption = page.locator('.text-btn.option').first()
  if ((await artOption.count()) > 0) {
    const isChrono = (await page.locator('.quiz-grid.three').count()) > 0
    if (isChrono) {
      const n = await page.locator('.quiz-art').count()
      for (let i = 0; i < n; i += 1) await page.locator('.quiz-art').nth(i).click()
    } else {
      await artOption.click()
    }
  } else if ((await textOption.count()) > 0) {
    await textOption.click()
  } else {
    await fail('no quiz options rendered')
  }
  await page.waitForSelector('.verdict', { timeout: 5000 })
  await page.waitForFunction(() => !document.querySelector('.verdict'), { timeout: 8000 })

  const duesAfter = await page.evaluate(async () => {
    const req = indexedDB.open('canon')
    const db = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
    const rows = await new Promise((res, rej) => {
      const tx = db.transaction('cards').objectStore('cards').getAll()
      tx.onsuccess = () => res(tx.result)
      tx.onerror = () => rej(tx.error)
    })
    db.close()
    return Object.fromEntries(rows.map((r) => [r.paintingId, r.due]))
  })

  const changed = Object.keys(duesBefore).some((id) => duesAfter[id] !== duesBefore[id])
  if (!changed) await fail('no stored FSRS card changed its due date after answering')
  console.log('PASS 4: a stored FSRS card due date changed after one quiz answer')

  console.log(`verify:live PASSED against ${URL}`)
  await browser.close()
} catch (err) {
  await fail(err instanceof Error ? err.message : String(err))
}
