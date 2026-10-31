// Renders the images the marketing page (web/marketing/) uses: the app icon
// from assets/icon.svg, a 1200x630 social preview, and web-sized WebP copies
// of the raw store captures (store/captures/, refreshed by `npm run store`).
// Run with `npm run marketing:images` after the icon or the captures change.
import { readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'web', 'marketing', 'img')
await mkdir(out, { recursive: true })

const icon = await readFile(join(root, 'assets', 'icon.svg'))

await sharp(icon, { density: 300 })
  .resize(256, 256)
  .png()
  .toFile(join(out, 'icon.png'))

// Social preview: icon + wordmark on the page's light background.
const iconPng = await sharp(icon, { density: 300 })
  .resize(280, 280)
  .png()
  .toBuffer()
const ogText =
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#f5f6fb"/>
  <text x="500" y="300" font-family="Space Grotesk, Segoe UI, Arial, sans-serif"
        font-size="108" font-weight="700" fill="#14121c">Promilla</text>
  <text x="504" y="372" font-family="Space Grotesk, Segoe UI, Arial, sans-serif"
        font-size="40" fill="#55536a">A private drink journal</text>
</svg>`)
await sharp(ogText)
  .composite([{ input: iconPng, left: 160, top: 175 }])
  .png()
  .toFile(join(out, 'og.png'))

const shots = [
  ['01-today.png', 'shot-today.webp'],
  ['02-log.png', 'shot-log.webp'],
  ['03-history.png', 'shot-history.webp'],
  ['04-insights.png', 'shot-insights.webp'],
]
for (const [src, dest] of shots) {
  await sharp(join(root, 'store', 'captures', src))
    .resize({ width: 600 })
    .webp({ quality: 82 })
    .toFile(join(out, dest))
}

console.log('Marketing images written to web/marketing/img')
