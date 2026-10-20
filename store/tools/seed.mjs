/**
 * The demo dataset and the pinned clock the store screenshots are taken with.
 *
 * Everything is a pure function of NOW and a fixed PRNG seed, so a re-shoot
 * produces the same nights, the same heatmap and the same curve as the
 * screenshots already in the listing. capture.mjs runs with
 * TZ=Europe/Stockholm (and pins the browser to it), so local day keys agree.
 *
 * The story it tells is deliberately unremarkable: a few drinks most
 * weekends, the odd glass of wine on a weekday, long dry stretches, a weekly
 * total trending down, and tonight a moderate evening still "Tipsy" at
 * 22:50. Nothing in it should read as heavy drinking being the point.
 */

const MIN = 60000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** Friday evening, 22:50 in Stockholm. Every capture sees this as "now". */
export const NOW = new Date('2026-10-16T22:50:00+02:00').getTime()
export const TIMEZONE = 'Europe/Stockholm'

const DRINKS = {
  beer: { type: 'beer', ml: 330, abv: 0.05 },
  wine: { type: 'wine', ml: 150, abv: 0.12 },
  cava: { type: 'cava', ml: 120, abv: 0.11 },
  liquor: { type: 'liquor', ml: 40, abv: 0.4 },
}

// mulberry32: tiny, fast, and the same sequence on every machine.
function prng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (n) => String(n).padStart(2, '0')
const key = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
/** Timestamp `days` before NOW's date at local hh:mm. */
const at = (days, hh, mm = 0) => {
  const d = new Date(NOW - days * DAY)
  d.setHours(hh, mm, 0, 0)
  return d.getTime()
}

let idSeq = 0
const entry = (kind, ts) => ({ id: `demo${++idSeq}`, ...DRINKS[kind], ts })

export function buildSeed() {
  idSeq = 0
  const rnd = prng(20261016)
  const days = {}

  // Tonight: beer, wine, beer — still Tipsy at 22:50, under the limit.
  days[key(NOW)] = {
    limit: 4,
    entries: [
      entry('beer', at(0, 19, 25)),
      entry('wine', at(0, 20, 35)),
      entry('beer', at(0, 21, 40)),
    ],
  }

  // Six months of history: fills History's monthly overview, the 12-week
  // heatmap and the 8-week sparkline without an empty leading stretch.
  for (let back = 1; back <= 182; back++) {
    const ts = at(back, 19)
    const dow = new Date(ts).getDay() // 0 Sun … 6 Sat
    const weekend = dow === 5 || dow === 6
    // Older weeks are a little heavier, so the trend reads as going down.
    const heavier = back > 28 ? 1 : 0
    const r = rnd()
    let n = 0
    if (weekend) n = r < 0.2 ? 0 : 1 + Math.floor(rnd() * 3) + heavier
    else if (r < 0.14) n = 1
    if (!n) continue

    const kinds = weekend
      ? ['beer', 'wine', 'beer', 'cava', 'wine', 'liquor']
      : ['wine']
    const start = weekend
      ? at(back, 19, Math.floor(rnd() * 50))
      : at(back, 19, 30)
    const entries = []
    for (let i = 0; i < n; i++) {
      const kind = kinds[(i + Math.floor(rnd() * 2)) % kinds.length]
      entries.push(entry(kind, start + i * (55 + Math.floor(rnd() * 25)) * MIN))
    }
    days[key(ts)] = { limit: weekend ? 4 : 2, entries }
  }

  return {
    version: 3,
    profile: { weight: 80, sex: 'M', weeklyTarget: 10, theme: 'blue' },
    sizes: {
      wine: { ml: 150, abv: 0.12 },
      beer: { ml: 330, abv: 0.05 },
      cava: { ml: 120, abv: 0.11 },
      liquor: { ml: 40, abv: 0.4 },
    },
    days,
  }
}

/**
 * Injected before any app script (Page.addScriptToEvaluateOnNewDocument):
 * replaces Date so `new Date()` / `Date.now()` start at NOW and then run on
 * normally, which keeps the app's 20 s tick and animations working.
 */
export function clockScript(now = NOW) {
  return `(() => {
    const Real = Date
    const offset = ${now} - Real.now()
    class PinnedDate extends Real {
      constructor(...a) { a.length ? super(...a) : super(Real.now() + offset) }
      static now() { return Real.now() + offset }
    }
    PinnedDate.parse = Real.parse
    PinnedDate.UTC = Real.UTC
    window.Date = PinnedDate
  })()`
}
