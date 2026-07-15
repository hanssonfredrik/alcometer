import { describe, it, expect } from 'vitest'
import { defaultData, migrate } from './storage.js'
import {
  DEFAULT_SIZES,
  DEFAULT_WEEKLY_TARGET,
  DEFAULT_THEME,
  DEFAULT_LIMIT,
} from './constants.js'

describe('defaultData', () => {
  it('produces the current schema shape', () => {
    const d = defaultData()
    expect(d.version).toBe(2)
    expect(d.profile).toMatchObject({ weight: 75, sex: 'M' })
    expect(d.sizes).toEqual(DEFAULT_SIZES)
    expect(d.days).toEqual({})
  })

  it('returns independent copies of the default sizes', () => {
    const a = defaultData()
    const b = defaultData()
    a.sizes.wine.ml = 999
    expect(b.sizes.wine.ml).toBe(DEFAULT_SIZES.wine.ml)
  })
})

describe('migrate — backfill', () => {
  it('fills missing top-level keys', () => {
    const d = migrate({})
    expect(d.sizes).toEqual(DEFAULT_SIZES)
    expect(d.profile).toBeTruthy()
    expect(d.days).toEqual({})
  })

  it('backfills weeklyTarget and theme on an existing profile', () => {
    const d = migrate({ profile: { weight: 90, sex: 'F' }, days: {} })
    expect(d.profile.weeklyTarget).toBe(DEFAULT_WEEKLY_TARGET)
    expect(d.profile.theme).toBe(DEFAULT_THEME)
    expect(d.profile.weight).toBe(90)
  })

  it('leaves an already-complete profile untouched', () => {
    const profile = {
      weight: 70,
      sex: 'F',
      weeklyTarget: 5,
      theme: 'cyan',
    }
    const d = migrate({ version: 2, profile, days: {} })
    expect(d.profile).toEqual(profile)
  })
})

describe('migrate — v1 → v2 logical-day re-bucket', () => {
  it('moves a post-midnight entry into the previous night bucket', () => {
    // v1 data: a 01:00 entry lived under its own calendar date.
    const v1 = {
      days: {
        '2026-01-11': {
          limit: 4,
          entries: [
            {
              id: 'a',
              type: 'beer',
              ml: 500,
              abv: 0.05,
              ts: Date.parse('2026-01-11T01:00:00'),
            },
          ],
        },
      },
    }
    const d = migrate(v1)
    expect(d.version).toBe(2)
    // 01:00 on the 11th rolls back to the night of the 10th.
    expect(d.days['2026-01-11']).toBeUndefined()
    expect(d.days['2026-01-10'].entries).toHaveLength(1)
    expect(d.days['2026-01-10'].entries[0].id).toBe('a')
  })

  it('groups an evening and its after-midnight entries into one bucket', () => {
    const v1 = {
      days: {
        '2026-02-01': {
          limit: 6,
          entries: [
            {
              id: 'e1',
              ts: Date.parse('2026-02-01T23:00:00'),
              ml: 500,
              abv: 0.05,
            },
          ],
        },
        '2026-02-02': {
          limit: 3,
          entries: [
            {
              id: 'e2',
              ts: Date.parse('2026-02-02T02:00:00'),
              ml: 500,
              abv: 0.05,
            },
          ],
        },
      },
    }
    const d = migrate(v1)
    const night = d.days['2026-02-01']
    expect(night.entries.map((e) => e.id)).toEqual(['e1', 'e2'])
    // Limit for the logical key comes from the same-date old bucket.
    expect(night.limit).toBe(6)
  })

  it('sorts entries within a bucket by timestamp', () => {
    const v1 = {
      days: {
        '2026-03-01': {
          limit: 5,
          entries: [
            {
              id: 'late',
              ts: Date.parse('2026-03-01T23:30:00'),
              ml: 500,
              abv: 0.05,
            },
            {
              id: 'early',
              ts: Date.parse('2026-03-01T20:00:00'),
              ml: 500,
              abv: 0.05,
            },
          ],
        },
      },
    }
    const d = migrate(v1)
    expect(d.days['2026-03-01'].entries.map((e) => e.id)).toEqual([
      'early',
      'late',
    ])
  })

  it('falls back to the default limit for an early-morning-only day', () => {
    const v1 = {
      days: {
        '2026-04-02': {
          limit: 2,
          entries: [
            {
              id: 'x',
              ts: Date.parse('2026-04-02T03:00:00'),
              ml: 500,
              abv: 0.05,
            },
          ],
        },
      },
    }
    const d = migrate(v1)
    // Rolls onto 2026-04-01, which had no old bucket → DEFAULT_LIMIT.
    expect(d.days['2026-04-01'].limit).toBe(DEFAULT_LIMIT)
  })

  it('is idempotent on already-logical (v2) data', () => {
    const v2 = {
      version: 2,
      profile: { weight: 75, sex: 'M', weeklyTarget: 10, theme: 'pink' },
      sizes: DEFAULT_SIZES,
      days: {
        '2026-05-10': {
          limit: 5,
          entries: [
            {
              id: 'a',
              ts: Date.parse('2026-05-10T22:00:00'),
              ml: 500,
              abv: 0.05,
            },
          ],
        },
      },
    }
    const once = migrate(structuredClone(v2))
    const twice = migrate(structuredClone(once))
    expect(twice.days).toEqual(once.days)
  })
})
