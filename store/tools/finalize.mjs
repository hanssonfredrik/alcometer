/**
 * Normalise the rendered store assets, then assert every store rule.
 * A sharp port of DiabetesNinja's store/ronin/tools/finalize.py (sharp is
 * already a devDependency here, so the kit needs no Python).
 *
 * The browser writes RGBA whatever the page looks like, and both stores reject
 * an alpha channel on most slots: Apple on screenshots and the marketing icon,
 * Play on its feature graphic and screenshots. So this drops the channel where
 * it is forbidden, then checks each file's exact pixel size, alpha and bytes.
 *
 * A separate pass rather than a flag on the renderers on purpose: it is worth
 * running on files somebody dropped in by hand too.
 *
 *   node store/tools/finalize.mjs        exits 1 if anything is off spec
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = path.join(ROOT, 'store/out')

const KB = 1024
const PLAY_ICON_MAX = 1024 * KB
// Play's own per-screenshot limit. Apple publishes none; this is just sanity.
const SCREENSHOT_MAX = 8 * 1024 * KB

/**
 * One expected output. `dir` + `ext` globs a folder of shots; `file` is one
 * exact file. alpha:false means the channel must not be there.
 */
const RULES = [
  // --- Google Play ---
  {
    file: 'googleplay/icon-512.png',
    size: [512, 512],
    alpha: true,
    maxBytes: PLAY_ICON_MAX,
    note: 'Play icon: 32-bit PNG with alpha, max 1024 KB',
  },
  {
    file: 'googleplay/feature-graphic.png',
    size: [1024, 500],
    alpha: false,
    note: 'Play feature graphic: 24-bit PNG, no alpha',
  },
  {
    dir: 'googleplay/phone',
    size: [1080, 1920],
    alpha: false,
    maxBytes: SCREENSHOT_MAX,
    minCount: 2,
    note: 'Play phone screenshots: 24-bit PNG, 2 to 8',
  },
  // --- App Store ---
  {
    file: 'appstore/icon-1024.png',
    size: [1024, 1024],
    alpha: false,
    note: 'App Store marketing icon (reference): square, no alpha',
  },
  {
    dir: 'appstore/iphone-6.9',
    size: [1320, 2868],
    alpha: false,
    maxBytes: SCREENSHOT_MAX,
    minCount: 1,
    note: 'App Store iPhone 6.9" portrait: no alpha',
  },
  {
    dir: 'appstore/iphone-6.3',
    size: [1206, 2622],
    alpha: false,
    maxBytes: SCREENSHOT_MAX,
    minCount: 1,
    note: 'App Store iPhone 6.3" (medium display) portrait: no alpha',
  },
  {
    dir: 'appstore/iphone-6.5',
    size: [1284, 2778],
    alpha: false,
    maxBytes: SCREENSHOT_MAX,
    minCount: 1,
    note: 'App Store iPhone 6.5" portrait: no alpha',
  },
]

async function normalise(file, wantAlpha) {
  const meta = await sharp(file).metadata()
  if (!wantAlpha && meta.hasAlpha) {
    // Read fully into memory first: sharp can't overwrite its own input.
    const buf = await sharp(await readFile(file))
      .flatten({ background: '#08070c' })
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer()
    await writeFile(file, buf)
  } else if (wantAlpha && !meta.hasAlpha) {
    const buf = await sharp(await readFile(file))
      .ensureAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer()
    await writeFile(file, buf)
  }
}

async function check(file, rule) {
  const meta = await sharp(file).metadata()
  const bytes = (await stat(file)).size
  const problems = []
  const [w, h] = rule.size
  if (meta.width !== w || meta.height !== h) {
    problems.push(`expected ${w}x${h}, got ${meta.width}x${meta.height}`)
  }
  if (!rule.alpha && meta.hasAlpha) {
    problems.push('alpha channel present; this slot forbids one')
  }
  if (rule.maxBytes && bytes > rule.maxBytes) {
    problems.push(
      `${Math.round(bytes / KB)} KB is over the ${rule.maxBytes / KB} KB limit`,
    )
  }
  if (rule.dir) {
    const lo = Math.min(meta.width, meta.height)
    const hi = Math.max(meta.width, meta.height)
    if (lo < 320 || hi > 3840) {
      problems.push(`sides ${lo}-${hi} fall outside the 320-3840 px range`)
    }
    if (rule.dir.startsWith('googleplay') && hi > 2 * lo) {
      problems.push(`${hi}x${lo} is longer than 2:1, which Play rejects`)
    }
  }
  return { meta, bytes, problems }
}

async function filesFor(rule) {
  if (rule.file) {
    const f = path.join(OUT, rule.file)
    return existsSync(f) ? [f] : []
  }
  const dir = path.join(OUT, rule.dir)
  if (!existsSync(dir)) return []
  return (await readdir(dir))
    .filter((n) => n.endsWith('.png'))
    .sort()
    .map((n) => path.join(dir, n))
}

let failures = 0
const line = '-'.repeat(92)
console.log(
  `${'file'.padEnd(44)} ${'size'.padStart(11)}  ${'alpha'.padEnd(5)} ${'bytes'.padStart(9)}  status`,
)
console.log(line)

for (const rule of RULES) {
  const files = await filesFor(rule)
  const need = rule.minCount ?? 1
  if (files.length < need) {
    console.log(
      `${(rule.file || rule.dir + '/*.png').padEnd(44)} ${'-'.padStart(11)}  ${'-'.padEnd(5)} ${'-'.padStart(9)}  MISSING (found ${files.length}, need ${need})  <- ${rule.note}`,
    )
    failures++
    continue
  }
  if (rule.dir && rule.dir.startsWith('googleplay') && files.length > 8) {
    console.log(`${rule.dir}: ${files.length} files; Play takes at most 8`)
    failures++
  }
  for (const file of files) {
    await normalise(file, rule.alpha)
    const { meta, bytes, problems } = await check(file, rule)
    if (problems.length) failures++
    console.log(
      `${path.relative(OUT, file).replaceAll('\\', '/').padEnd(44)} ${`${meta.width}x${meta.height}`.padStart(11)}  ${String(meta.hasAlpha).padEnd(5)} ${String(bytes).padStart(9)}  ${problems.length ? 'FAIL: ' + problems.join('; ') : 'ok'}`,
    )
  }
}

console.log(line)
if (failures) {
  console.log(`${failures} problem(s). Nothing here is ready to upload.`)
  process.exitCode = 1
} else {
  console.log('All assets match the store specs in store/README.md.')
}
