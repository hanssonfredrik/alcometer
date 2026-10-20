/**
 * Photograph the real app for the store screenshots.
 *
 * Serves the production build (dist/, via `vite preview`), opens it in headless
 * Edge at an iPhone-sized viewport, pins the clock to seed.mjs's NOW, seeds the
 * demo data into localStorage['neontrk_v1'], then walks the steps of each shot
 * in shots.json and saves captures/<id>-<page>.png.
 *
 * Unlike DiabetesNinja's emulator captures there are no system bars to crop:
 * the web build in a bare viewport is exactly the app's own pixels.
 *
 *   npm run build && node store/tools/capture.mjs
 *   node store/tools/capture.mjs --only 01
 *
 * Run with TZ=Europe/Stockholm (the npm script does) so the seed's day keys
 * match the browser, which is pinned to the same zone.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, newPage, screenshot, sleep } from './cdp.mjs'
import { buildSeed, clockScript, TIMEZONE } from './seed.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CAPTURES = path.join(ROOT, 'store/captures')
const APP_PORT = 4318
const CDP_PORT = 9351
const APP = `http://localhost:${APP_PORT}/`

/**
 * iPhone 16 Pro Max in CSS pixels at 3x: 1290 x 2796. Tall enough for the
 * 6.9" / 6.5" App Store canvases; render.mjs fits it into Play's 9:16 too.
 * (Below App.module.css's 480 x 940 breakpoint, so the app fills the viewport
 * rather than drawing its desktop phone frame.)
 */
const VIEWPORT = { width: 430, height: 932, deviceScaleFactor: 3 }

const onlyIx = process.argv.indexOf('--only')
const only = onlyIx === -1 ? null : process.argv[onlyIx + 1]

if (!existsSync(path.join(ROOT, 'dist/index.html'))) {
  throw new Error('No dist/ build. Run `npm run build` first.')
}

const shots = JSON.parse(
  await readFile(path.join(ROOT, 'store/tools/shots.json'), 'utf8'),
)

// ---- Serve dist/ -----------------------------------------------------------
const server = spawn(
  process.execPath,
  [
    path.join(ROOT, 'node_modules/vite/bin/vite.js'),
    'preview',
    '--port',
    String(APP_PORT),
    '--strictPort',
  ],
  { cwd: ROOT, stdio: 'ignore' },
)
let up = false
for (let i = 0; i < 100 && !up; i++) {
  try {
    up = (await fetch(APP)).ok
  } catch {
    await sleep(100)
  }
}
if (!up) {
  server.kill()
  throw new Error(`vite preview never answered on ${APP}`)
}

const { cdp, stop } = await launch(CDP_PORT)
const errors = []

// Scroll the first element whose own text contains `text` into view.
const scrollExpr = (text, block) =>
  `(() => { const el = [...document.querySelectorAll('body *')].find(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.includes(${JSON.stringify(text)}))); if (!el) return 'missing'; el.scrollIntoView({ block: '${block}' }) })()`

// One small DOM helper set, injected per step. CSS Module class names are
// hashed, so everything is found by visible text.
const dom = {
  tab: (label) =>
    `(b => b ? (b.click(), 'ok') : 'missing')([...document.querySelectorAll('nav button')].find(b => b.textContent.trim() === ${JSON.stringify(label)}))`,
  click: (text) =>
    `(b => b ? (b.click(), 'ok') : 'missing')([...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(text)})))`,
  scrollTo: (text) => scrollExpr(text, 'center'),
  scrollToTop: (text) => scrollExpr(text, 'start'),
  hasText: (text) =>
    `document.body.textContent.includes(${JSON.stringify(text)})`,
}

try {
  await newPage(cdp)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    ...VIEWPORT,
    mobile: true,
  })
  await cdp.send('Emulation.setTimezoneOverride', { timezoneId: TIMEZONE })
  // Reduced motion makes every transition land instantly (global.css), so a
  // capture never catches the needle mid-sweep or the sheet mid-slide.
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source:
      clockScript() +
      `;window.__storeErrors = [];
      addEventListener('error', (e) => __storeErrors.push(String(e.message)));
      addEventListener('unhandledrejection', (e) => __storeErrors.push(String(e.reason)));`,
  })
  await cdp.send('Runtime.enable')

  // Seed on the app's own origin, then reload into the seeded state.
  await cdp.send('Page.navigate', { url: APP })
  await cdp.waitFor('document.readyState === "complete"')
  await cdp.eval(
    `localStorage.setItem('neontrk_v1', ${JSON.stringify(JSON.stringify(buildSeed()))})`,
  )

  for (const shot of shots.screenshots) {
    if (only && shot.id !== only) continue

    // A fresh load per shot, so one shot's open sheet can't leak into the next.
    await cdp.send('Page.navigate', { url: APP })
    await cdp.waitFor('document.querySelectorAll("nav button").length >= 4')
    await cdp.eval('document.fonts.ready.then(() => true)')

    for (const step of shot.steps) {
      const [kind, arg] = Object.entries(step)[0]
      if (kind === 'wait') {
        await cdp.waitFor(dom.hasText(arg))
        continue
      }
      if (!dom[kind]) throw new Error(`shot ${shot.id}: unknown step ${kind}`)
      const res = await cdp.eval(dom[kind](arg))
      if (res === 'missing') {
        throw new Error(`shot ${shot.id}: ${kind} target not found: ${arg}`)
      }
      await sleep(250)
    }

    await sleep(600) // let layout and images settle
    const pageErr = await cdp.eval(
      'window.__storeErrors ? window.__storeErrors.join("\\n") : ""',
    )
    if (pageErr) errors.push(`${shot.id}: ${pageErr}`)

    const out = path.join(CAPTURES, `${shot.id}-${shot.page}.png`)
    await screenshot(cdp, out)
    console.log(`  captured ${path.relative(ROOT, out)}`)
  }
} finally {
  stop()
  server.kill()
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log('\nCaptures done. Run node store/tools/render.mjs next.')
}
