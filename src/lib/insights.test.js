import { describe, it, expect } from 'vitest'
import { dayDetail } from './insights.js'
import { DEFAULT_LIMIT, STD_GLASS_GRAMS, ETHANOL_DENSITY } from './constants.js'

const MALE = { weight: 80, sex: 'M' }

// Timestamps on the target day (tests are pinned to Europe/Stockholm).
const at = (hour, minute = 0) =>
  new Date(2026, 2, 14, hour, minute, 0, 0).getTime()

const drink = (ts, ml = 500, abv = 0.05, type = 'beer') => ({
  id: String(ts),
  type,
  ml,
  abv,
  ts,
})

describe('dayDetail', () => {
  it('returns a zeroed, empty day for a key that was never logged', () => {
    const d = dayDetail({}, '2026-03-14', MALE)
    expect(d).toMatchObject({
      key: '2026-03-14',
      entries: [],
      count: 0,
      limit: DEFAULT_LIMIT,
      over: false,
      grams: 0,
      std: 0,
      peak: 0,
    })
  })

  it('sorts entries chronologically and totals them', () => {
    const days = {
      '2026-03-14': {
        limit: 3,
        entries: [drink(at(23)), drink(at(20)), drink(at(21, 30))],
      },
    }
    const d = dayDetail(days, '2026-03-14', MALE)
    expect(d.entries.map((e) => e.ts)).toEqual([at(20), at(21, 30), at(23)])
    expect(d.count).toBe(3)
    expect(d.over).toBe(false)
    expect(d.grams).toBeCloseTo(3 * 500 * 0.05 * ETHANOL_DENSITY, 6)
    expect(d.std).toBeCloseTo(d.grams / STD_GLASS_GRAMS, 6)
    expect(d.peak).toBeGreaterThan(0)
  })

  it('flags a day over its own limit', () => {
    const days = {
      '2026-03-14': { limit: 1, entries: [drink(at(20)), drink(at(21))] },
    }
    expect(dayDetail(days, '2026-03-14', MALE).over).toBe(true)
  })

  it('treats a limit of 0 as intentional, not missing', () => {
    const days = { '2026-03-14': { limit: 0, entries: [drink(at(20))] } }
    const d = dayDetail(days, '2026-03-14', MALE)
    expect(d.limit).toBe(0)
    expect(d.over).toBe(true)
  })

  it('falls back to the default limit when the day has none', () => {
    const days = { '2026-03-14': { entries: [drink(at(20))] } }
    expect(dayDetail(days, '2026-03-14', MALE).limit).toBe(DEFAULT_LIMIT)
  })

  it('does not mutate the stored entry order', () => {
    const entries = [drink(at(23)), drink(at(20))]
    const days = { '2026-03-14': { limit: 3, entries } }
    dayDetail(days, '2026-03-14', MALE)
    expect(entries.map((e) => e.ts)).toEqual([at(23), at(20)])
  })
})
