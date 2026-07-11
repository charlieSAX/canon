// Labelled contact sheets for the required visual identity check.
import { existsSync, mkdirSync } from 'node:fs'
import sharp from 'sharp'
import master from '../pipeline/master-list.json' with { type: 'json' }

const COLS = 5
const ROWS = 5
const CELL_W = 240
const CELL_H = 220
const PAGE_SIZE = COLS * ROWS
const outputDir = 'pipeline/contact-sheets'

function xml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

mkdirSync(outputDir, { recursive: true })

for (let start = 0; start < master.new.length; start += PAGE_SIZE) {
  const entries = master.new.slice(start, start + PAGE_SIZE)
  const layers = []
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    const imagePath = `public/img/${entry.id}.webp`
    if (!existsSync(imagePath)) continue
    const left = (index % COLS) * CELL_W
    const top = Math.floor(index / COLS) * CELL_H
    const image = await sharp(imagePath)
      .resize(220, 170, { fit: 'contain', background: '#0d0d0d' })
      .toBuffer()
    const label = Buffer.from(`
      <svg width="220" height="36" xmlns="http://www.w3.org/2000/svg">
        <style>
          .id { fill: #ece8e1; font: 11px -apple-system, BlinkMacSystemFont, sans-serif; }
          .artist { fill: #8c8984; font: 9px -apple-system, BlinkMacSystemFont, sans-serif; }
        </style>
        <text class="id" x="0" y="13">${xml(entry.id)}</text>
        <text class="artist" x="0" y="29">${xml(entry.artist)}</text>
      </svg>
    `)
    layers.push({ input: image, left: left + 10, top: top + 8 })
    layers.push({ input: label, left: left + 10, top: top + 180 })
  }
  const page = String(Math.floor(start / PAGE_SIZE) + 1).padStart(2, '0')
  await sharp({
    create: {
      width: COLS * CELL_W,
      height: ROWS * CELL_H,
      channels: 3,
      background: '#0d0d0d'
    }
  })
    .composite(layers)
    .webp({ quality: 82 })
    .toFile(`${outputDir}/new-${page}.webp`)
}

console.log(`contact sheets: ${Math.ceil(master.new.length / PAGE_SIZE)} written to ${outputDir}`)
