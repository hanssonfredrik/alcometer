/**
 * Frame the captures into store screenshots and render the Play feature
 * graphic. Ported from DiabetesNinja's store/ronin/tools/render.mjs.
 *
 * Reads the shot list and its copy from shots.json, takes captures from
 * store/captures/<id>-<page>.png (capture.mjs), and writes one PNG per shot
 * per canvas per language at exactly the size each store asks for.
 *
 *   node store/tools/render.mjs
 *   node store/tools/render.mjs --only 03        # one shot, all canvases
 *   node store/tools/render.mjs --only feature   # just the feature graphic
 *
 * Then run finalize.mjs, which drops the alpha channel where a store forbids
 * it and checks every file against the spec.
 */

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { launch, renderToPng } from './cdp.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const TEMPLATES = path.join(ROOT, 'store/templates')
const CAPTURES = path.join(ROOT, 'store/captures')
const PORT = 9352

/**
 * Output-directory suffix per language: English owns the bare names. Add
 * `sv: '-sv'` here (plus sv copy in shots.json and sv captures) for a Swedish
 * listing, following the Ronin kit.
 */
const LANGS = { en: '' }

/**
 * Play: sides 320-3840 px and the long side at most twice the short one, so
 * 1080x1920 sits well inside the rule.
 *
 * App Store, two sets on purpose: 1320x2868 is the 6.9" size, but App Store
 * Connect only offers that slot once a processed build is attached to the
 * version; before that it shows the 6.5" slot and rejects 6.9" files. 1284x2778
 * is accepted either way (Apple scales the rest from it).
 */
const CANVASES = {
  play: { w: 1080, h: 1920, dir: 'store/out/googleplay/phone' },
  appstore69: { w: 1320, h: 2868, dir: 'store/out/appstore/iphone-6.9' },
  appstore65: { w: 1284, h: 2778, dir: 'store/out/appstore/iphone-6.5' },
}

const FEATURE = {
  w: 1024,
  h: 500,
  out: 'store/out/googleplay/feature-graphic.png',
}

function templateUrl(template, params = {}) {
  const url = pathToFileURL(path.join(TEMPLATES, template))
  for (const [k, v] of Object.entries(params))
    url.searchParams.set(k, String(v))
  return url.href
}

const onlyIx = process.argv.indexOf('--only')
const only = onlyIx === -1 ? null : process.argv[onlyIx + 1]

const shots = JSON.parse(
  await readFile(path.join(ROOT, 'store/tools/shots.json'), 'utf8'),
)
const { cdp, stop } = await launch(PORT)
let written = 0

try {
  for (const [lang, suffix] of Object.entries(LANGS)) {
    for (const shot of shots.screenshots) {
      if (only && shot.id !== only) continue

      const screen = path.join(CAPTURES, `${shot.id}-${shot.page}.png`)
      if (!existsSync(screen)) {
        throw new Error(
          `missing capture: ${path.relative(ROOT, screen)}\n` +
            'Run npm run build && node store/tools/capture.mjs first.',
        )
      }

      for (const [name, canvas] of Object.entries(CANVASES)) {
        const url = templateUrl('screenshot.html', {
          screen: pathToFileURL(screen).href,
          title: shot.title[lang],
          sub: shot.sub?.[lang] ?? '',
          w: canvas.w,
          h: canvas.h,
        })
        const out = path.join(
          ROOT,
          `${canvas.dir}${suffix}`,
          `${shot.id}-${shot.page}.png`,
        )
        await renderToPng(cdp, url, canvas, out)
        written++
        console.log(
          `  ${lang} ${name.padEnd(10)} ${canvas.w}x${canvas.h}  ${path.relative(ROOT, out)}`,
        )
      }
    }

    if (!only || only === 'feature') {
      const out = path.join(ROOT, FEATURE.out.replace('.png', `${suffix}.png`))
      await renderToPng(
        cdp,
        templateUrl('feature-graphic.html', { lang }),
        FEATURE,
        out,
      )
      written++
      console.log(
        `  ${lang} feature    ${FEATURE.w}x${FEATURE.h}   ${path.relative(ROOT, out)}`,
      )
    }
  }
  console.log(
    `\n${written} file(s) rendered. Run node store/tools/finalize.mjs next.`,
  )
} finally {
  stop()
}
