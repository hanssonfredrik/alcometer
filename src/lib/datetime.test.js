import { describe, it, expect } from 'vitest'
import {
  dateKey,
  dayIndex,
  addDays,
  startOfWeek,
  formatTime,
  DAY_MS,
} from './datetime.js'
import { DAY_START_HOUR } from './constants.js'

// These tests assume the process runs in Europe/Stockholm (set via the
// `test` npm script's TZ). Stockholm observes DST, which is exactly what the
// noon-anchored helpers are designed to survive.

describe('dateKey (logical day rolls at DAY_START_HOUR)', () => {
  it('keeps a daytime timestamp on its calendar date', () => {
    expect(dateKey(Date.parse('2026-03-14T20:00:00'))).toBe('2026-03-14')
  })

  it('rolls a pre-05:00 timestamp back to the previous date', () => {
    // 01:00 on the 15th belongs to the night of the 14th.
    expect(dateKey(Date.parse('2026-03-15T01:00:00'))).toBe('2026-03-14')
  })

  it('flips exactly at DAY_START_HOUR', () => {
    expect(DAY_START_HOUR).toBe(5)
    expect(dateKey(Date.parse('2026-03-15T04:59:00'))).toBe('2026-03-14')
    expect(dateKey(Date.parse('2026-03-15T05:00:00'))).toBe('2026-03-15')
  })

  it('rolls a just-after-midnight timestamp across a month boundary', () => {
    expect(dateKey(Date.parse('2026-04-01T02:30:00'))).toBe('2026-03-31')
  })
})

describe('dayIndex', () => {
  it('assigns consecutive integers to consecutive dates', () => {
    expect(dayIndex('2026-01-02') - dayIndex('2026-01-01')).toBe(1)
  })

  it('is stable across a spring-forward DST boundary', () => {
    // Europe/Stockholm springs forward on 2026-03-29 (23h day). Noon-anchoring
    // keeps the index gap at exactly one day.
    expect(dayIndex('2026-03-30') - dayIndex('2026-03-29')).toBe(1)
  })

  it('is stable across an autumn fall-back DST boundary', () => {
    // Falls back on 2026-10-25 (25h day).
    expect(dayIndex('2026-10-26') - dayIndex('2026-10-25')).toBe(1)
  })
})

describe('addDays', () => {
  it('advances by the requested number of calendar days', () => {
    const start = Date.parse('2026-01-01T08:00:00')
    expect(dateKey(addDays(start, 3))).toBe('2026-01-04')
  })

  it('crosses a spring-forward boundary without drift', () => {
    // 2026-03-28 + 1 day must land on 2026-03-29 despite the 23h day.
    const start = Date.parse('2026-03-28T09:00:00')
    expect(dateKey(addDays(start, 1))).toBe('2026-03-29')
  })

  it('supports negative offsets', () => {
    const start = Date.parse('2026-01-01T08:00:00')
    expect(dateKey(addDays(start, -1))).toBe('2025-12-31')
  })
})

describe('startOfWeek', () => {
  it('returns the Monday of the containing week', () => {
    // 2026-01-07 is a Wednesday → week starts Monday 2026-01-05.
    const wed = Date.parse('2026-01-07T15:00:00')
    expect(dateKey(startOfWeek(wed))).toBe('2026-01-05')
  })

  it('treats Sunday as the end of its week, not the start', () => {
    // 2026-01-11 is a Sunday → still belongs to the week starting 2026-01-05.
    const sun = Date.parse('2026-01-11T22:00:00')
    expect(dateKey(startOfWeek(sun))).toBe('2026-01-05')
  })

  it('is idempotent on a Monday', () => {
    const mon = Date.parse('2026-01-05T00:30:00')
    expect(dateKey(startOfWeek(mon))).toBe('2026-01-05')
  })
})

describe('formatTime', () => {
  it('zero-pads hours and minutes', () => {
    expect(formatTime(Date.parse('2026-01-01T09:05:00'))).toBe('09:05')
  })

  it('formats a late-evening time', () => {
    expect(formatTime(Date.parse('2026-01-01T23:45:00'))).toBe('23:45')
  })
})

describe('DAY_MS', () => {
  it('is one day of milliseconds', () => {
    expect(DAY_MS).toBe(86400000)
  })
})
