import { describe, it, expect } from 'vitest'
import { countEntries, restoreBackup, validateBackup } from './backup.js'
import { DEFAULT_SIZES, DEFAULT_THEME } from './constants.js'

const entry = (id, ts, type = 'beer') => ({ id, type, ml: 330, abv: 0.05, ts })

const backup = () => ({
  version: 3,
  profile: { weight: 62, sex: 'F', weeklyTarget: 6, theme: 'green' },
  sizes: { ...DEFAULT_SIZES, wine: { ml: 125, abv: 0.11 } },
  days: {
    '2026-03-01': { limit: 3, entries: [entry('b', 200), entry('a', 100)] },
    '2026-03-02': { limit: 5, entries: [entry('c', 300)] },
  },
})

describe('countEntries', () => {
  it('sums entries across days', () => {
    expect(countEntries(backup())).toBe(3)
  })

  it('tolerates empty or malformed data', () => {
    expect(countEntries({ days: {} })).toBe(0)
    expect(countEntries({ days: { x: {} } })).toBe(0)
    expect(countEntries(null)).toBe(0)
  })
})

describe('restoreBackup', () => {
  it('returns the file contents as the whole new state', () => {
    const { data, entries } = restoreBackup(backup())
    expect(entries).toBe(3)
    expect(data.version).toBe(3)
    expect(data.profile).toEqual(backup().profile)
    expect(data.sizes.wine).toEqual({ ml: 125, abv: 0.11 })
    expect(Object.keys(data.days).sort()).toEqual(['2026-03-01', '2026-03-02'])
    expect(data.days['2026-03-01'].limit).toBe(3)
  })

  it('sorts each day by timestamp', () => {
    const { data } = restoreBackup(backup())
    expect(data.days['2026-03-01'].entries.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('does not mutate the imported object', () => {
    const src = backup()
    const snapshot = JSON.stringify(src)
    restoreBackup(src)
    expect(JSON.stringify(src)).toBe(snapshot)
  })

  it('migrates an older backup on the way in', () => {
    const old = {
      profile: { weight: 80, sex: 'M' },
      days: { '2026-03-01': { limit: 4, entries: [entry('a', 100)] } },
    }
    const { data, entries } = restoreBackup(old)
    expect(entries).toBe(1)
    expect(data.version).toBe(3)
    expect(data.sizes).toEqual(DEFAULT_SIZES)
    expect(data.profile.theme).toBe(DEFAULT_THEME)
  })
})

describe('validateBackup', () => {
  it('accepts an object with a days map', () => {
    expect(validateBackup({ days: {} })).toEqual({ days: {} })
  })

  it('rejects non-objects and files without day data', () => {
    expect(() => validateBackup(null)).toThrow(/isn't a Promilla backup/)
    expect(() => validateBackup([])).toThrow(/isn't a Promilla backup/)
    expect(() => validateBackup({ profile: {} })).toThrow(
      /backup is incomplete/,
    )
  })
})
