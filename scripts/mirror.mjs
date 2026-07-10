// Authoring-time tool: convert a downloaded Commons original to the committed
// WebP at 1600px longest edge, quality 80. Usage:
//   node scripts/mirror.mjs <input-image> <painting-id>
// Prints the emitted width and height for the painting JSON.
import sharp from 'sharp'
import path from 'node:path'
import process from 'node:process'

const [input, id] = process.argv.slice(2)
if (!input || !id) {
  console.error('usage: node scripts/mirror.mjs <input-image> <painting-id>')
  process.exit(1)
}

const out = path.join('public', 'img', `${id}.webp`)
const image = sharp(input, { limitInputPixels: false })
const meta = await image.metadata()
const landscape = (meta.width ?? 0) >= (meta.height ?? 0)
const resized = image.resize(
  landscape ? { width: Math.min(1600, meta.width ?? 1600) } : { height: Math.min(1600, meta.height ?? 1600) }
)
await resized.webp({ quality: 80 }).toFile(out)
const emitted = await sharp(out).metadata()
console.log(JSON.stringify({ id, src: `img/${id}.webp`, width: emitted.width, height: emitted.height }))
