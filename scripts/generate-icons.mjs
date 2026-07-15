// Rasterises the SVG sources in /assets into the PNG icons the PWA manifest
// and index.html reference, plus the source images `@capacitor/assets`
// expects for the native iOS/Android icon and splash sets (assets/native/).
// Run with `npm run icons` after editing the SVGs.
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assets = join(root, 'assets')
const publicDir = join(root, 'public')
const nativeDir = join(assets, 'native')

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

// ---------------------------------------------------------------------------
// Native (Capacitor) source images, derived from the same two SVGs so the
// art has a single source of truth. `npx @capacitor/assets generate
// --assetPath assets/native` fans these out into the platform icon/splash
// sets. All derivations are string edits of known lines — fail loudly if the
// SVGs change shape.

function derive(svg, description, pattern, replacement) {
  const out = svg.replace(pattern, replacement)
  if (out === svg.toString()) {
    throw new Error(
      `generate-icons: could not derive ${description} — did the source SVG change?`,
    )
  }
  return Buffer.from(out)
}

const iconSvg = icon.toString()
const maskableSvg = maskable.toString()

// iOS icons are opaque squares (the OS applies the corner mask itself).
const fullBleed = derive(iconSvg, 'full-bleed icon', 'rx="112" ', '')

// Android adaptive icon: glyph-only foreground on transparency + bg gradient.
const foreground = derive(
  maskableSvg,
  'adaptive-icon foreground',
  /\s*<!-- Full-bleed background.*\n\s*<rect width="512" height="512" fill="url\(#bg\)"\/>/,
  '',
)
const background = derive(
  maskableSvg,
  'adaptive-icon background',
  /<g transform[\s\S]*<\/g>/,
  '',
)

// Splash: the bg gradient across the full canvas with a small centred glyph.
const glyphMatch = maskableSvg.match(/<g transform[\s\S]*<\/g>/)
const defsMatch = maskableSvg.match(/<defs>[\s\S]*<\/defs>/)
const glyphInner = glyphMatch[0]
  .replace(/<g transform="[^"]*">/, '')
  .replace(/<\/g>$/, '')
const splash =
  Buffer.from(`<svg width="2732" height="2732" viewBox="0 0 2732 2732" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${defsMatch[0]}
  <rect width="2732" height="2732" fill="url(#bg)"/>
  <g transform="translate(1366 1366) scale(1.5) translate(-256 -256)">${glyphInner}</g>
</svg>`)

await mkdir(nativeDir, { recursive: true })

const nativeTargets = [
  { src: fullBleed, size: 1024, out: 'icon-only.png', flatten: true },
  { src: foreground, size: 1024, out: 'icon-foreground.png' },
  { src: background, size: 1024, out: 'icon-background.png', flatten: true },
  { src: splash, size: 2732, out: 'splash.png', flatten: true },
  { src: splash, size: 2732, out: 'splash-dark.png', flatten: true },
]

for (const { src, size, out, flatten } of nativeTargets) {
  let img = sharp(src, { density: 384 }).resize(size, size)
  // Store icons/splashes must not carry an alpha channel.
  if (flatten) img = img.flatten({ background: '#08070c' })
  await img.png().toFile(join(nativeDir, out))
  console.log(`✓ native/${out} (${size}×${size})`)
}
