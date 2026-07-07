// Rasterises the SVG sources in /assets into the PNG icons the PWA manifest
// and index.html reference. Run with `npm run icons` after editing the SVGs.
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assets = join(root, 'assets')
const publicDir = join(root, 'public')

const icon = await readFile(join(assets, 'icon.svg'))
const maskable = await readFile(join(assets, 'maskable.svg'))

const targets = [
  { src: icon, size: 192, out: 'pwa-192x192.png' },
  { src: icon, size: 512, out: 'pwa-512x512.png' },
  { src: icon, size: 180, out: 'apple-touch-icon.png' },
  { src: maskable, size: 512, out: 'maskable-512x512.png' },
]

await mkdir(publicDir, { recursive: true })

for (const { src, size, out } of targets) {
  await sharp(src, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(publicDir, out))
  console.log(`✓ ${out} (${size}×${size})`)
}

// Ship the crisp SVG as the browser-tab favicon too.
await copyFile(join(assets, 'icon.svg'), join(publicDir, 'favicon.svg'))
console.log('✓ favicon.svg')
