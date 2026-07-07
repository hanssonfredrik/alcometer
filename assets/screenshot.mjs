// Headless-Edge screenshotter for the three screens, driven over the Chrome
// DevTools Protocol. No dependencies (Node 18+ global fetch/WebSocket).
//
// Prereq: a server is running on APP (default `npm run preview` on :4317).
// Usage:  node assets/screenshot.mjs
// Output: screenshots/0{1,2,3}-{today,history,setup}.png in the project root.
import { spawn } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const APP = 'http://localhost:4317/'
const PORT = 9333

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'screenshots')
const PROFILE = join(root, 'node_modules', '.edge-profile')
await mkdir(OUT, { recursive: true })

// ---- Seed: a lively night (over limit) plus a few historical days ----
const now = Date.now()
const day = 86400000
const k = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const seed = {
  profile: { weight: 82, sex: 'M' },
  sizes: {
    wine: { ml: 150, abv: 0.12 },
    beer: { ml: 330, abv: 0.05 },
    cava: { ml: 120, abv: 0.11 },
    liquor: { ml: 60, abv: 0.4 },
  },
  days: {
    [k(now)]: {
      limit: 4,
      entries: [
        { id: 'a', type: 'beer', ml: 330, abv: 0.05, ts: now - 3 * 3600000 },
        { id: 'b', type: 'wine', ml: 150, abv: 0.12, ts: now - 2 * 3600000 },
        { id: 'c', type: 'beer', ml: 330, abv: 0.05, ts: now - 3600000 },
        { id: 'd', type: 'liquor', ml: 60, abv: 0.4, ts: now - 1800000 },
        { id: 'e', type: 'wine', ml: 150, abv: 0.12, ts: now - 600000 },
      ],
    },
    [k(now - 2 * day)]: { limit: 5, entries: [{ id: 'f', type: 'wine', ml: 150, abv: 0.12, ts: now - 2 * day }] },
    [k(now - 3 * day)]: { limit: 5, entries: [{ id: 'g', type: 'beer', ml: 330, abv: 0.05, ts: now - 3 * day }, { id: 'h', type: 'beer', ml: 330, abv: 0.05, ts: now - 3 * day }] },
    [k(now - 9 * day)]: { limit: 5, entries: [{ id: 'i', type: 'cava', ml: 120, abv: 0.11, ts: now - 9 * day }] },
    [k(now - 40 * day)]: { limit: 5, entries: [{ id: 'j', type: 'wine', ml: 150, abv: 0.12, ts: now - 40 * day }] },
  },
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const edge = spawn(
  EDGE,
  [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank',
  ],
  { stdio: 'ignore' },
)

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = tabs.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page.webSocketDebuggerUrl
    } catch {
      /* browser not ready yet */
    }
    await sleep(250)
  }
  throw new Error('Could not reach Edge DevTools — is Edge installed at EDGE?')
}

const ws = new WebSocket(await getWsUrl())
await new Promise((res, rej) => {
  ws.onopen = res
  ws.onerror = rej
})

let msgId = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
}
const send = (method, params = {}) =>
  new Promise((res) => {
    const id = ++msgId
    pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
  })

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 452, height: 920, deviceScaleFactor: 2, mobile: true })

const goto = async (url) => {
  await send('Page.navigate', { url })
  await sleep(1200)
}
const evalJs = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true })
const capture = async (name) => {
  await sleep(500)
  const { result } = await send('Page.captureScreenshot', { format: 'png' })
  const file = join(OUT, name)
  await writeFile(file, Buffer.from(result.data, 'base64'))
  console.log('saved', file)
}
const clickTab = async (label) => {
  await evalJs(`[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()==='${label}')?.click()`)
  await sleep(400)
}

await goto(APP)
await evalJs(`localStorage.setItem('neontrk_v1', ${JSON.stringify(JSON.stringify(seed))})`)
await goto(APP)
await capture('01-today.png')
await clickTab('History')
await capture('02-history.png')
await clickTab('Setup')
await capture('03-setup.png')

ws.close()
edge.kill()
console.log('done')
