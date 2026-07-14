// Pure, framework-free analytics over the persisted `days` map. Kept out of the
// screens so the aggregation is unit-testable, like the rest of `lib/`.

import { totalGrams } from './alcohol.js'
import { STD_GLASS_GRAMS, DEFAULT_LIMIT } from './constants.js'
import { dateKey, dayIndex, addDays, startOfWeek } from './datetime.js'

/**
 * Average drinks and standard glasses per weekday, over the span from the
 * first-ever logged day to today. Days with no entries count as zero (they're
 * real observations of "a Tuesday you didn't drink"), but days before the first
 * log or in the future are excluded so a fresh install doesn't dilute averages.
 *
 * Returns an array indexed like `getDay()` (0 = Sunday .. 6 = Saturday):
 *   [{ day, count, std, sampleDays }]
 * where `count`/`std` are per-day averages and `sampleDays` the divisor used.
 */
export function weekdayAverages(days, now) {
  const drinkKeys = Object.keys(days).filter(
    (k) => (days[k].entries || []).length > 0,
  )
  const acc = Array.from({ length: 7 }, () => ({
    count: 0,
    grams: 0,
    sampleDays: 0,
  }))
  if (!drinkKeys.length) {
    return acc.map((a, day) => ({ day, count: 0, std: 0, sampleDays: 0 }))
  }

  const startIdx = Math.min(...drinkKeys.map(dayIndex))
  const todayIdx = dayIndex(dateKey(now))
  // Walk every logical day in range, anchored at noon so the weekday is stable.
  const startTs = addDays(now, -(todayIdx - startIdx))
  for (let i = startIdx; i <= todayIdx; i++) {
    const ts = addDays(startTs, i - startIdx)
    const weekday = new Date(ts).getDay()
    const bucket = acc[weekday]
    bucket.sampleDays++
    const day = days[dateKey(ts)]
    if (day && day.entries.length) {
      bucket.count += day.entries.length
      bucket.grams += totalGrams(day.entries)
    }
  }

  return acc.map((a, day) => ({
    day,
    count: a.sampleDays ? a.count / a.sampleDays : 0,
    std: a.sampleDays ? a.grams / a.sampleDays / STD_GLASS_GRAMS : 0,
    sampleDays: a.sampleDays,
  }))
}

/**
 * A GitHub-style contribution grid for the last `weeks` weeks: one column per
 * week (oldest first), each column an array of 7 day cells Monday→Sunday.
 *
 * Each cell: { key, weekday, count, limit, status } where status is one of
 *   'empty'  — before the first log or in the future (nothing to show)
 *   'sober'  — a day in range with no drinks
 *   'within' — drinks logged, at or under that day's limit
 *   'over'   — drinks logged, above that day's limit
 */
export function heatmapGrid(days, now, weeks = 12) {
  const drinkKeys = Object.keys(days).filter(
    (k) => (days[k].entries || []).length > 0,
  )
  const firstIdx = drinkKeys.length
    ? Math.min(...drinkKeys.map(dayIndex))
    : Infinity
  const todayIdx = dayIndex(dateKey(now))

  const thisMonday = startOfWeek(now)
  const columns = []
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = addDays(thisMonday, -w * 7)
    const cells = []
    for (let d = 0; d < 7; d++) {
      const ts = addDays(weekStart, d)
      const key = dateKey(ts)
      const idx = dayIndex(key)
      const inRange = idx >= firstIdx && idx <= todayIdx
      const day = days[key]
      const count = day ? day.entries.length : 0
      const limit = day && day.limit != null ? day.limit : DEFAULT_LIMIT
      let status = 'empty'
      if (inRange) {
        if (count === 0) status = 'sober'
        else status = count <= limit ? 'within' : 'over'
      }
      cells.push({
        key,
        weekday: new Date(ts).getDay(),
        count,
        limit,
        status,
      })
    }
    columns.push(cells)
  }
  return columns
}

/** Standard glasses consumed in the week starting at `mondayTs`. */
function weekStd(days, mondayTs) {
  let grams = 0
  for (let i = 0; i < 7; i++) {
    const day = days[dateKey(addDays(mondayTs, i))]
    if (day) grams += totalGrams(day.entries)
  }
  return grams / STD_GLASS_GRAMS
}

/**
 * Rolling 4-week average of standard glasses per week, and its direction versus
 * the previous 4-week block. Framed against the user's weekly `target`.
 *
 * Returns:
 *   {
 *     current,        // std/week averaged over the last 4 completed-or-current weeks
 *     previous,       // std/week averaged over the 4 weeks before that
 *     direction,      // 'up' | 'down' | 'flat'
 *     deltaPct,       // signed % change vs previous (0 when previous is 0)
 *     target,         // the weekly target passed in
 *     overTarget,     // current − target (positive = over)
 *     weeks,          // per-week std series, oldest first (length = window*2)
 *   }
 */
export function weeklyTrend(days, now, target = 0, window = 4) {
  const thisMonday = startOfWeek(now)
  const total = window * 2
  const series = []
  for (let w = total - 1; w >= 0; w--) {
    series.push(weekStd(days, addDays(thisMonday, -w * 7)))
  }
  const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0)
  const current = avg(series.slice(window))
  const previous = avg(series.slice(0, window))

  const EPS = 0.05 // ignore sub-noise wobble so a flat trend reads as flat
  let direction = 'flat'
  if (current - previous > EPS) direction = 'up'
  else if (previous - current > EPS) direction = 'down'

  const deltaPct = previous > 0 ? ((current - previous) / previous) * 100 : 0

  return {
    current,
    previous,
    direction,
    deltaPct,
    target,
    overTarget: current - target,
    weeks: series,
  }
}
