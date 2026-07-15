import { describe, it, expect } from 'vitest'
import {
  entryGrams,
  totalGrams,
  bacAt,
  peakBac,
  computeStreaks,
  nextMilestone,
} from './alcohol.js'
import {
  ETHANOL_DENSITY,
  BURN_RATE,
  WIDMARK_R,
  MILESTONES,
} from './constants.js'

const HOUR = 3600000
const MALE = { weight: 80, sex: 'M' }

// A single 500 ml @ 5% beer: 500 * 0.05 * 0.789 = 19.725 g of alcohol.
const beer = (ts, ml = 500, abv = 0.05) => ({
  id: String(ts),
  type: 'beer',
  ml,
  abv,
  ts,
})

describe('entryGrams / totalGrams', () => {
  it('computes grams of pure alcohol for one entry', () => {
    expect(entryGrams(beer(0))).toBeCloseTo(500 * 0.05 * ETHANOL_DENSITY, 6)
  })

  it('sums grams across entries', () => {
    const entries = [beer(0), beer(HOUR), beer(2 * HOUR)]
    expect(totalGrams(entries)).toBeCloseTo(3 * 500 * 0.05 * ETHANOL_DENSITY, 6)
  })

  it('totals to zero for an empty list', () => {
    expect(totalGrams([])).toBe(0)
  })
})

describe('bacAt (Widmark with linear burn-off)', () => {
  it('returns 0 with no entries', () => {
    expect(bacAt([], 0, MALE)).toBe(0)
  })

  it('follows BAC = A / (r · weight) − β · t at the first drink (t=0)', () => {
    const entries = [beer(0)]
    const grams = entryGrams(entries[0])
    const expected = grams / (WIDMARK_R.M * MALE.weight)
    expect(bacAt(entries, 0, MALE)).toBeCloseTo(expected, 6)
  })

  it('subtracts burn-off over elapsed hours', () => {
    const entries = [beer(0)]
    const grams = entryGrams(entries[0])
    const twoHoursLater = grams / (WIDMARK_R.M * MALE.weight) - BURN_RATE * 2
    expect(bacAt(entries, 2 * HOUR, MALE)).toBeCloseTo(twoHoursLater, 6)
  })

  it('ignores entries after the query time', () => {
    const entries = [beer(0), beer(3 * HOUR)]
    // At t=1h only the first beer counts.
    const grams = entryGrams(entries[0])
    const expected = grams / (WIDMARK_R.M * MALE.weight) - BURN_RATE * 1
    expect(bacAt(entries, HOUR, MALE)).toBeCloseTo(expected, 6)
  })

  it('never returns a negative BAC once fully burned off', () => {
    const entries = [beer(0)]
    // Far in the future, burn-off would drive the value negative → clamp to 0.
    expect(bacAt(entries, 100 * HOUR, MALE)).toBe(0)
  })

  it('uses the female body-water ratio', () => {
    const female = { weight: 80, sex: 'F' }
    const entries = [beer(0)]
    const grams = entryGrams(entries[0])
    expect(bacAt(entries, 0, female)).toBeCloseTo(
      grams / (WIDMARK_R.F * female.weight),
      6,
    )
  })

  it('falls back to the male ratio for an unknown sex', () => {
    const entries = [beer(0)]
    const grams = entryGrams(entries[0])
    expect(bacAt(entries, 0, { weight: 80, sex: 'X' })).toBeCloseTo(
      grams / (WIDMARK_R.M * 80),
      6,
    )
  })

  it('defaults weight to 75 kg when missing', () => {
    const entries = [beer(0)]
    const grams = entryGrams(entries[0])
    expect(bacAt(entries, 0, { sex: 'M' })).toBeCloseTo(
      grams / (WIDMARK_R.M * 75),
      6,
    )
  })
})

describe('peakBac', () => {
  it('returns 0 with no entries', () => {
    expect(peakBac([], MALE)).toBe(0)
  })

  it('peaks at the last drink before burn-off dominates', () => {
    const entries = [beer(0), beer(HOUR), beer(2 * HOUR)]
    const peak = peakBac(entries, MALE)
    // Peak is at least the BAC at the final entry time.
    expect(peak).toBeCloseTo(bacAt(entries, 2 * HOUR, MALE), 6)
    expect(peak).toBeGreaterThan(bacAt(entries, 0, MALE))
  })

  it('considers the optional upto timestamp', () => {
    const entries = [beer(0)]
    // upto earlier than any rise cannot exceed the entry-time peak.
    const peak = peakBac(entries, MALE, 5 * HOUR)
    expect(peak).toBeCloseTo(bacAt(entries, 0, MALE), 6)
  })
})

describe('computeStreaks', () => {
  const day = (key, count = 1) => ({
    [key]: { entries: Array.from({ length: count }, (_, i) => ({ id: i })) },
  })

  it('reports no history before the first drink', () => {
    expect(computeStreaks({}, Date.parse('2026-01-10T12:00:00'))).toEqual({
      current: 0,
      longest: 0,
      ever: false,
    })
  })

  it('ignores days with an empty entries array', () => {
    const days = { '2026-01-01': { entries: [] } }
    expect(computeStreaks(days, Date.parse('2026-01-10T12:00:00'))).toEqual({
      current: 0,
      longest: 0,
      ever: false,
    })
  })

  it('counts the current sober run up to today', () => {
    // Drank on the 1st, nothing since; "today" is the 5th → 4 sober days.
    const days = day('2026-01-01')
    const now = Date.parse('2026-01-05T12:00:00')
    const streaks = computeStreaks(days, now)
    expect(streaks.ever).toBe(true)
    expect(streaks.current).toBe(4)
  })

  it('resets the current run when today has a drink', () => {
    const days = { ...day('2026-01-01'), ...day('2026-01-05') }
    const now = Date.parse('2026-01-05T12:00:00')
    expect(computeStreaks(days, now).current).toBe(0)
  })

  it('tracks the longest gap between drink days', () => {
    // Drink on Jan 1 and Jan 10 → 8 sober days between them.
    const days = { ...day('2026-01-01'), ...day('2026-01-10') }
    const now = Date.parse('2026-01-10T12:00:00')
    expect(computeStreaks(days, now).longest).toBe(8)
  })
})

describe('nextMilestone', () => {
  it('returns the first milestone above the current streak', () => {
    expect(nextMilestone(0)).toEqual(MILESTONES[0])
    expect(nextMilestone(MILESTONES[0].d)).toEqual(MILESTONES[1])
  })

  it('returns null once every milestone is reached', () => {
    const last = MILESTONES[MILESTONES.length - 1].d
    expect(nextMilestone(last)).toBeNull()
  })
})
