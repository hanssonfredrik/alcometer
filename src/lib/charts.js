import { BAC_ZONES, BURN_RATE } from './constants.js'
import { bacAt, soberAt } from './alcohol.js'

const MIN = 60000
const HOUR = 3600000

/* ---------------------------------------------------------------------------
 * BAC gauge (speedometer)
 * ------------------------------------------------------------------------- */

/** Top of the dial in ‰. Anything above pins the needle to the end. */
export const GAUGE_MAX = 1.5

/**
 * The dial's breakpoints in ‰: 0, each finite zone boundary, then GAUGE_MAX.
 * Derived from BAC_ZONES so the dial always follows the constants.
 */
function gaugeStops() {
  const bounds = BAC_ZONES.map((z) => z.max).filter(
    (m) => m > 0 && Number.isFinite(m) && m < GAUGE_MAX,
  )
  return [0, ...bounds, GAUGE_MAX]
}

/**
 * Position of a ‰ value along the dial, 0..1. Piecewise-linear so every
 * zone band gets an equal share of the arc; a linear scale would squash
 * "light" (0–0.2) into a sliver next to "drunk" (0.5–1.0).
 */
export function gaugeScale(bac) {
  const stops = gaugeStops()
  const v = Math.min(Math.max(bac || 0, 0), GAUGE_MAX)
  const seg = 1 / (stops.length - 1)
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i]) {
      const f = (v - stops[i - 1]) / (stops[i] - stops[i - 1])
      return (i - 1 + f) * seg
    }
  }
  return 1
}

/**
 * The coloured bands of the dial as [{ id, from, to }] in 0..1 dial units.
 * `sober` is a single point (0 ‰) and gets no band.
 */
export function gaugeBands() {
  const stops = gaugeStops()
  const zones = BAC_ZONES.filter((z) => z.id !== 'sober')
  return stops.slice(1).map((_, i) => ({
    id: zones[i].id,
    from: gaugeScale(stops[i]),
    to: gaugeScale(stops[i + 1]),
  }))
}

/** The labelled ticks of the dial: [{ value, t, label }]. */
export function gaugeTicks() {
  return gaugeStops().map((value) => ({
    value,
    t: gaugeScale(value),
    label: String(value),
  }))
}

/**
 * Point on a top semicircle centred at (cx, cy). t = 0 is the far left,
 * t = 1 the far right, 0.5 straight up (SVG y grows downward).
 */
export function polar(cx, cy, r, t) {
  const a = Math.PI * (1 - t)
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
}

const fmt = (n) => Math.round(n * 100) / 100

/** SVG path for the arc of the top semicircle between dial positions t0 < t1. */
export function arcPath(cx, cy, r, t0, t1) {
  const a = polar(cx, cy, r, t0)
  const b = polar(cx, cy, r, t1)
  return `M ${fmt(a.x)} ${fmt(a.y)} A ${r} ${r} 0 0 1 ${fmt(b.x)} ${fmt(b.y)}`
}

/* ---------------------------------------------------------------------------
 * BAC curve
 * ------------------------------------------------------------------------- */

/** BacCurve's plot size in SVG units (it stretches to the card). */
export const CURVE_W = 320
export const CURVE_H = 110

const PAD = 15 * MIN
const MAX_SPAN = 14 * HOUR

/**
 * The time span the curve covers, or null with no entries.
 *
 * Starts 15 min before the first drink. Today it runs to whichever is later
 * of `now` and the projected sober time (the part after `now` is the
 * no-more-drinks projection); on a past day it runs until the last drink's
 * level had burned off. Capped at 14 h so an odd entry can't flatten it.
 */
export function curveWindow(entries, profile, now, isToday) {
  if (!entries.length) return null
  const times = entries.map((e) => e.ts)
  const first = Math.min(...times)
  const last = Math.max(...times)
  const from = first - PAD
  let end
  if (isToday) {
    end = Math.max(now, last, soberAt(bacAt(entries, now, profile), now) ?? 0)
  } else {
    const atLast = bacAt(entries, last, profile)
    end = last + (atLast / BURN_RATE) * HOUR
  }
  const to = Math.min(end + PAD, from + MAX_SPAN)
  return { from, to, nowTs: isToday ? Math.min(Math.max(now, from), to) : null }
}

/**
 * [{ ts, bac }] samples of the curve across [from, to], always computed with
 * bacAt so the chart can never disagree with the hero number. Adds a vertex
 * pair at each drink (just before / at) so the instant-absorption step is
 * drawn vertical, plus any `extra` timestamps (e.g. now).
 */
export function bacSeries(
  entries,
  profile,
  { from, to, stepMin = 5, extra = [] },
) {
  const set = new Set()
  const step = stepMin * MIN
  for (let t = from; t < to; t += step) set.add(t)
  set.add(to)
  for (const e of entries) {
    if (e.ts > from && e.ts <= to) {
      set.add(e.ts - 1)
      set.add(e.ts)
    }
  }
  for (const t of extra) if (t >= from && t <= to) set.add(t)
  return [...set]
    .sort((a, b) => a - b)
    .map((ts) => ({ ts, bac: bacAt(entries, ts, profile) }))
}

/** "M x y L x y …" through a list of {x, y}. */
export function linePath(pts) {
  return pts.map((p, i) => `${i ? 'L' : 'M'} ${fmt(p.x)} ${fmt(p.y)}`).join(' ')
}

/** A closed area path from a line down to the baseline y = `base`. */
function areaPath(pts, base) {
  if (!pts.length) return ''
  const first = pts[0]
  const last = pts.at(-1)
  return `${linePath(pts)} L ${fmt(last.x)} ${fmt(base)} L ${fmt(first.x)} ${fmt(base)} Z`
}

/**
 * Everything BacCurve draws, in SVG units for a w × h plot. Splits the line
 * at `nowTs` into the solid "so far" part and the dashed projection.
 *
 * Returns { past, future, area, now, guides, drinks, yMax, peak } where
 * paths are strings, `now` is {x, y} or null, guides are the zone
 * boundaries that fit under yMax, and drinks are tick x positions.
 */
export function curveGeometry(entries, profile, win, { w, h }) {
  const series = bacSeries(entries, profile, {
    from: win.from,
    to: win.to,
    extra: win.nowTs != null ? [win.nowTs] : [],
  })
  const peak = Math.max(0, ...series.map((p) => p.bac))
  const yMax = Math.max(peak * 1.15, 0.5)
  const span = win.to - win.from || 1
  const x = (ts) => ((ts - win.from) / span) * w
  const y = (bac) => h - (bac / yMax) * h
  const pts = series.map((p) => ({ x: x(p.ts), y: y(p.bac), ts: p.ts }))

  const cut = win.nowTs
  const pastPts = cut == null ? pts : pts.filter((p) => p.ts <= cut)
  const futurePts = cut == null ? [] : pts.filter((p) => p.ts >= cut)
  const nowPt = cut == null ? null : pts.find((p) => p.ts === cut) || null

  const guides = BAC_ZONES.filter(
    (z) => z.max > 0 && Number.isFinite(z.max) && z.max < yMax,
  ).map((z) => ({ id: z.id, value: z.max, y: y(z.max) }))

  return {
    past: linePath(pastPts),
    future: futurePts.length > 1 ? linePath(futurePts) : '',
    area: areaPath(pastPts, h),
    futureArea: futurePts.length > 1 ? areaPath(futurePts, h) : '',
    now: nowPt ? { x: nowPt.x, y: nowPt.y } : null,
    guides,
    drinks: entries
      .filter((e) => e.ts >= win.from && e.ts <= win.to)
      .map((e) => ({ id: e.id, x: x(e.ts) })),
    yMax,
    peak,
  }
}

/* ---------------------------------------------------------------------------
 * Sparkline
 * ------------------------------------------------------------------------- */

/**
 * Line + area paths for a small series across a w × h box, scaled so the
 * largest of the values and `max` reaches the top (leave headroom via max).
 * Returns { line, area, points: [{x, y}] , yOf(v) }.
 */
export function sparkPath(values, w, h, max = 0) {
  const top = Math.max(max, ...values, 0.001)
  const n = values.length
  const yOf = (v) => h - (v / top) * h
  const points = values.map((v, i) => ({
    x: n > 1 ? (i / (n - 1)) * w : w / 2,
    y: yOf(v),
  }))
  return {
    line: linePath(points),
    area: areaPath(points, h),
    points,
    yOf,
  }
}
