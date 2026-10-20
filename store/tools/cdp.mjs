/**
 * Headless Edge (or Chrome) driven over the Chrome DevTools Protocol, used two
 * ways by the store kit:
 *
 *   - capture.mjs points it at the running app (seeded, clock pinned) and
 *     photographs real screens;
 *   - render.mjs points it at the HTML templates and uses it as a pixel-exact
 *     rasteriser for the framed store screenshots and the feature graphic.
 *
 * A real browser rather than an image library because it is the only thing that
 * renders the app's own woff2 faces, CSS and SVG exactly as the phone does.
 *
 * Node 22+ has a global WebSocket, so this speaks CDP directly: no puppeteer,
 * no dependency. Ported from DiabetesNinja's store/ronin/tools/cdp.mjs.
 *
 * Emulation.setDeviceMetricsOverride is what makes output exact: --window-size
 * crops instead of reflowing, and the viewport x deviceScaleFactor is simply
 * the output size.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const BROWSERS = [
  process.env.STORE_BROWSER,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  #ws
  #id = 0
  #pending = new Map()
  #sessionId = null

  static async connect(url) {
    const cdp = new Cdp()
    cdp.#ws = new WebSocket(url)
    await new Promise((resolve, reject) => {
      cdp.#ws.addEventListener('open', resolve, { once: true })
      cdp.#ws.addEventListener('error', reject, { once: true })
    })
    cdp.#ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data)
      const p = cdp.#pending.get(msg.id)
      if (!p) return
      cdp.#pending.delete(msg.id)
      if (msg.error) p.reject(new Error(msg.error.message))
      else p.resolve(msg.result)
    })
    return cdp
  }

  send(method, params = {}, sessionId = this.#sessionId) {
    const id = ++this.#id
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    this.#ws.send(JSON.stringify(payload))
    return new Promise((resolve, reject) =>
      this.#pending.set(id, { resolve, reject }),
    )
  }

  async attach(targetId) {
    // flatten:true routes the page session over this same socket, so one bare
    // WebSocket is enough for the whole run.
    const { sessionId } = await this.send(
      'Target.attachToTarget',
      { targetId, flatten: true },
      null,
    )
    this.#sessionId = sessionId
    return sessionId
  }

  /** Evaluate an expression in the attached page and return its value. */
  async eval(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (exceptionDetails) {
      throw new Error(`page threw: ${exceptionDetails.exception?.description}`)
    }
    return result.value
  }

  /** Poll an expression until it is truthy (or throw after `timeout` ms). */
  async waitFor(expression, timeout = 15000) {
    const end = Date.now() + timeout
    while (Date.now() < end) {
      if (await this.eval(`!!(${expression})`)) return
      await sleep(50)
    }
    throw new Error(`timed out waiting for: ${expression}`)
  }

  close() {
    this.#ws.close()
  }
}

/**
 * Launch a headless browser with a throwaway profile (so no service worker
 * or storage survives between runs) and return a connected client.
 */
export async function launch(port) {
  const exe = BROWSERS.find((b) => existsSync(b))
  if (!exe) {
    throw new Error(
      'No Edge or Chrome found; set STORE_BROWSER to the browser executable.',
    )
  }
  const userDataDir = path.join(os.tmpdir(), `promilla-store-${port}`)
  await rm(userDataDir, { recursive: true, force: true })

  // --headless=new is what assets/screenshot.mjs uses with Edge on this
  // machine. (DiabetesNinja notes Chrome's new headless wrote nothing there;
  // set STORE_HEADLESS=old to fall back to plain --headless.)
  const headless =
    process.env.STORE_HEADLESS === 'old' ? '--headless' : '--headless=new'
  const browser = spawn(
    exe,
    [
      headless,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--allow-file-access-from-files',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  let wsUrl
  for (let i = 0; i < 150; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`)
      wsUrl = (await res.json()).webSocketDebuggerUrl
      break
    } catch {
      await sleep(100)
    }
  }
  if (!wsUrl) throw new Error('The browser never opened its debugging port')

  const cdp = await Cdp.connect(wsUrl)
  return {
    cdp,
    stop: () => {
      cdp.close()
      browser.kill()
    },
  }
}

/** Open a fresh tab, attach to it and return its target id. */
export async function newPage(cdp) {
  const { targetId } = await cdp.send(
    'Target.createTarget',
    { url: 'about:blank' },
    null,
  )
  await cdp.attach(targetId)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  return targetId
}

export async function closePage(cdp, targetId) {
  await cdp.send('Target.closeTarget', { targetId }, null)
}

/** Capture the attached page as a PNG at `out`. */
export async function screenshot(cdp, out) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, Buffer.from(data, 'base64'))
  return out
}

/**
 * Render one template URL at exactly w x h (1 CSS px = 1 output px) and write
 * the PNG. The page must set window.__ready once its layout, fonts and images
 * have settled — polling that beats a fixed sleep, because a webfont that has
 * not landed yet renders in a fallback face and nothing flags it.
 */
export async function renderToPng(cdp, url, { w, h }, out) {
  const targetId = await newPage(cdp)
  try {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await cdp.send('Page.navigate', { url })
    await cdp.waitFor('window.__ready === true')
    return await screenshot(cdp, out)
  } finally {
    await closePage(cdp, targetId)
  }
}
