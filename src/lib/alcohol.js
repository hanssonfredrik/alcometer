import {
  ETHANOL_DENSITY,
  BURN_RATE,
  WIDMARK_R,
  MILESTONES,
} from './constants.js'
import { dateKey, dayIndex } from './datetime.js'

/** Grams of pure alcohol in a single logged entry. */
export function entryGrams(entry) {
  return entry.ml * entry.abv * ETHANOL_DENSITY
}

/** Total grams of pure alcohol across a list of entries. */
export function totalGrams(entries) {
  return entries.reduce((sum, e) => sum + entryGrams(e), 0)
}

/**
 * Estimated blood-alcohol concentration (‰, per mille) at time `atTs`,
 * using the Widmark formula with linear burn-off.
 *
 *   BAC = A / (r · weight) − β · t
 *
 * where A is grams consumed up to `atTs`, r the body-water ratio,
 * t hours since the first drink, and β the burn-off rate.
 */
export function bacAt(entries, atTs, profile) {
  if (!entries.length) return 0
  const r = WIDMARK_R[profile.sex] ?? WIDMARK_R.M
  const grams = entries
    .filter((e) => e.ts <= atTs)
    .reduce((sum, e) => sum + entryGrams(e), 0)
  if (grams <= 0) return 0
  const first = Math.min(...entries.map((e) => e.ts))
  const hours = Math.max(0, (atTs - first) / 3600000)
  return Math.max(0, grams / (r * (profile.weight || 75)) - BURN_RATE * hours)
}

/**
 * Peak BAC across a night. Evaluates the curve at each entry time (BAC only
 * rises at those moments) plus an optional `upto` timestamp.
 */
export function peakBac(entries, profile, upto) {
  if (!entries.length) return 0
  let peak = 0
  const times = entries.map((e) => e.ts)
  if (upto) times.push(upto)
  for (const t of times) {
    const b = bacAt(entries, t, profile)
    if (b > peak) peak = b
  }
  return peak
}

/**
 * Sober-day streaks. A "sober day" is a calendar day with no logged drinks,
 * counted only within the span from the first-ever drink to today.
 *
 * Returns { current, longest, ever } where `ever` is false until the first
 * drink is logged.
 */
export function computeStreaks(days, now) {
  const drinkKeys = Object.keys(days).filter(
    (k) => (days[k].entries || []).length > 0,
  )
  if (!drinkKeys.length) return { current: 0, longest: 0, ever: false }

  const drinkDays = new Set(drinkKeys.map(dayIndex))
  const start = Math.min(...drinkDays)
  const todayIdx = dayIndex(dateKey(now))

  let longest = 0
  let run = 0
  for (let i = start; i <= todayIdx; i++) {
    if (drinkDays.has(i)) {
      run = 0
    } else {
      run++
      if (run > longest) longest = run
    }
  }

  let current = 0
  for (let i = todayIdx; i >= start; i--) {
    if (drinkDays.has(i)) break
    current++
  }

  return { current, longest, ever: true }
}

/** The next unreached milestone for a given current streak, or null. */
export function nextMilestone(currentStreak) {
  return MILESTONES.find((m) => currentStreak < m.d) || null
}
