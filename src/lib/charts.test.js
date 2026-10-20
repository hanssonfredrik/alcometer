import { describe, it, expect } from 'vitest'
import {
  GAUGE_MAX,
  gaugeScale,
  gaugeBands,
  gaugeTicks,
  polar,
  arcPath,
  curveWindow,
  bacSeries,
  curveGeometry,
  sparkPath,
} from './charts.js'
import { bacAt, soberAt } from './alcohol.js'

const MIN = 60000
const HOUR = 3600000
const MALE = { weight: 80, sex: 'M' }
const T0 = new Date('2026-10-17T20:00:00').getTime()
const beer = (ts, ml = 500, abv = 0.05) => ({
  id: String(ts),
  type: 'beer',
  ml,
  abv,
  ts,
})

describe('gaugeScale', () => {
  it('maps each zone boundary to an equal quarter of the dial', () => {
    expect(gaugeScale(0)).toBe(0)
    expect(gaugeScale(0.2)).toBeCloseTo(0.25)
    expect(gaugeScale(0.5)).toBeCloseTo(0.5)
    expect(gaugeScale(1.0)).toBeCloseTo(0.75)
    expect(gaugeScale(GAUGE_MAX)).toBe(1)
  })

  it('is monotonic and interpolates inside a band', () => {
    expect(gaugeScale(0.1)).toBeCloseTo(0.125)
    let prev = -1
    for (let v = 0; v <= 2; v += 0.05) {
      const t = gaugeScale(v)
      expect(t).toBeGreaterThanOrEqual(prev)
      prev = t
    }
  })

  it('clamps below 0, above the max, and bad input', () => {
    expect(gaugeScale(-1)).toBe(0)
    expect(gaugeScale(3)).toBe(1)
    expect(gaugeScale(undefined)).toBe(0)
    expect(gaugeScale(NaN)).toBe(0)
  })
})

describe('gaugeBands / gaugeTicks', () => {
  it('derives four contiguous bands from BAC_ZONES, skipping sober', () => {
    const bands = gaugeBands()
    expect(bands.map((b) => b.id)).toEqual(['light', 'tipsy', 'drunk', 'heavy'])
    expect(bands[0].from).toBe(0)
    expect(bands.at(-1).to).toBe(1)
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].from).toBeCloseTo(bands[i - 1].to)
    }
  })

  it('ticks sit on the zone boundaries', () => {
    expect(gaugeTicks().map((t) => t.label)).toEqual([
      '0',
      '0.2',
      '0.5',
      '1',
      '1.5',
    ])
  })
})

describe('polar / arcPath', () => {
  it('runs left → top → right on a top semicircle', () => {
    const l = polar(100, 100, 50, 0)
    const top = polar(100, 100, 50, 0.5)
    const r = polar(100, 100, 50, 1)
    expect(l.x).toBeCloseTo(50)
    expect(l.y).toBeCloseTo(100)
    expect(top.x).toBeCloseTo(100)
    expect(top.y).toBeCloseTo(50)
    expect(r.x).toBeCloseTo(150)
  })

  it('emits a clockwise small arc', () => {
    expect(arcPath(100, 100, 50, 0, 1)).toBe('M 50 100 A 50 50 0 0 1 150 100')
  })
})

describe('curveWindow', () => {
  it('is null with no entries', () => {
    expect(curveWindow([], MALE, T0, true)).toBeNull()
  })

  it('today: pads the first drink and runs to the projected sober time', () => {
    const entries = [beer(T0), beer(T0 + HOUR)]
    const now = T0 + 2 * HOUR
    const win = curveWindow(entries, MALE, now, true)
    const sober = soberAt(bacAt(entries, now, MALE), now)
    expect(win.from).toBe(T0 - 15 * MIN)
    expect(win.to).toBe(sober + 15 * MIN)
    expect(win.nowTs).toBe(now)
  })

  it('today but already sober: ends just after now', () => {
    const entries = [beer(T0, 330, 0.035)]
    const now = T0 + 6 * HOUR
    const win = curveWindow(entries, MALE, now, true)
    expect(win.to).toBe(now + 15 * MIN)
  })

  it('past day: ends when the last drink burned off, no now marker', () => {
    const entries = [beer(T0), beer(T0 + HOUR)]
    const win = curveWindow(entries, MALE, T0 + 48 * HOUR, false)
    const last = T0 + HOUR
    const end = soberAt(bacAt(entries, last, MALE), last)
    expect(win.to).toBe(end + 15 * MIN)
    expect(win.nowTs).toBeNull()
    expect(bacAt(entries, win.to, MALE)).toBe(0)
  })

  it('caps the span at 14 h', () => {
    const entries = [beer(T0), beer(T0 + 20 * HOUR)]
    const win = curveWindow(entries, MALE, T0 + 21 * HOUR, true)
    expect(win.to - win.from).toBe(14 * HOUR)
  })
})

describe('bacSeries', () => {
  it('matches bacAt at every sample and steps vertically at each drink', () => {
    const entries = [beer(T0), beer(T0 + HOUR)]
    const s = bacSeries(entries, MALE, {
      from: T0 - 15 * MIN,
      to: T0 + 3 * HOUR,
    })
    for (const p of s) expect(p.bac).toBe(bacAt(entries, p.ts, MALE))
    const i = s.findIndex((p) => p.ts === T0 + HOUR)
    expect(s[i - 1].ts).toBe(T0 + HOUR - 1)
    expect(s[i].bac).toBeGreaterThan(s[i - 1].bac)
    // Sorted, no duplicates.
    for (let k = 1; k < s.length; k++)
      expect(s[k].ts).toBeGreaterThan(s[k - 1].ts)
  })

  it('includes extra timestamps such as now', () => {
    const now = T0 + 37 * MIN + 13
    const s = bacSeries([beer(T0)], MALE, {
      from: T0,
      to: T0 + HOUR,
      extra: [now],
    })
    expect(s.some((p) => p.ts === now)).toBe(true)
  })
})

describe('curveGeometry', () => {
  const entries = [beer(T0), beer(T0 + HOUR)]
  const now = T0 + 2 * HOUR

  it('splits at now: solid past, dashed projection reaching zero', () => {
    const win = curveWindow(entries, MALE, now, true)
    const g = curveGeometry(entries, MALE, win, { w: 300, h: 100 })
    expect(g.past).toMatch(/^M /)
    expect(g.future).toMatch(/^M /)
    expect(g.now.y).toBeLessThan(100)
    // Projection ends on the baseline (sober).
    expect(g.future.trim().endsWith(' 100')).toBe(true)
    expect(g.drinks).toHaveLength(2)
    expect(g.peak).toBeCloseTo(bacAt(entries, T0 + HOUR, MALE))
  })

  it('keeps headroom: yMax is at least 0.5 ‰ and above the peak', () => {
    const light = [beer(T0, 330, 0.035)]
    const win = curveWindow(light, MALE, T0 + 10 * MIN, true)
    const g = curveGeometry(light, MALE, win, { w: 300, h: 100 })
    expect(g.yMax).toBe(0.5)
    // Only zone guides that fit under yMax (0.2) are drawn.
    expect(g.guides.map((x) => x.value)).toEqual([0.2])
  })

  it('past day: one solid line, no projection or now marker', () => {
    const win = curveWindow(entries, MALE, T0 + 48 * HOUR, false)
    const g = curveGeometry(entries, MALE, win, { w: 300, h: 100 })
    expect(g.future).toBe('')
    expect(g.now).toBeNull()
  })
})

describe('sparkPath', () => {
  it('spans the width and scales to the larger of data and max', () => {
    const s = sparkPath([0, 5, 10], 100, 50, 20)
    expect(s.points[0]).toEqual({ x: 0, y: 50 })
    expect(s.points[2]).toEqual({ x: 100, y: 25 })
    expect(s.yOf(20)).toBe(0)
    expect(s.area).toMatch(/Z$/)
  })

  it('copes with all-zero and single-value series', () => {
    expect(sparkPath([0, 0, 0], 100, 50).points.every((p) => p.y === 50)).toBe(
      true,
    )
    expect(sparkPath([3], 100, 50).points[0].x).toBe(50)
  })
})
