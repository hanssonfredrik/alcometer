/**
 * Store icons, rendered straight from the app's own icon source
 * (assets/icon.svg, the same file `npm run icons` builds the PWA and native
 * icons from), so the store icon is the icon on the phone. Never redraw it.
 *
 *   out/googleplay/icon-512.png   Play listing icon (32-bit PNG, ≤ 1 MB)
 *   out/appstore/icon-1024.png    reference copy only: since Xcode 14 the
 *                                 marketing icon comes from the asset catalog
 *                                 in the binary; App Store Connect has no field
 *
 * Both are full-bleed squares: each store applies its own corner mask.
 *
 *   node store/tools/icons.mjs
 */

import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const svg = await readFile(path.join(ROOT, 'assets/icon.svg'))

const OUT = [
  { size: 512, file: 'store/out/googleplay/icon-512.png', alpha: true },
  { size: 1024, file: 'store/out/appstore/icon-1024.png', alpha: false },
]

for (const { size, file, alpha } of OUT) {
  const out = path.join(ROOT, file)
  await mkdir(path.dirname(out), { recursive: true })
  let img = sharp(svg, { density: Math.ceil((72 * size) / 512) }).resize(
    size,
    size,
  )
  if (!alpha) img = img.flatten({ background: '#08070c' }).removeAlpha()
  await img.png({ compressionLevel: 9 }).toFile(out)
  console.log(`  ${size}x${size}  ${file}`)
}
