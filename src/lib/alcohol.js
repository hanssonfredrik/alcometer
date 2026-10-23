import {
  ETHANOL_DENSITY,
  BURN_RATE,
  WIDMARK_R,
  MILESTONES,
  BAC_ZONES,
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
 * Each drink adds A / (r · weight), where A is its grams of alcohol and r
 * the body-water ratio. Between drinks the level falls by β per hour and
 * stops at zero. Walking the drinks in order (instead of one closed-form
 * A / (r · weight) − β · t over the whole day) means hours spent at zero
 * never count against a later drink.
 */
export function bacAt(entries, atTs, profile) {
  if (!entries.length) return 0
  const r = WIDMARK_R[profile.sex] ?? WIDMARK_R.M
  const perGram = 1 / (r * (profile.weight || 75))
  const burn = (level, from, to) =>
    Math.max(0, level - (BURN_RATE * (to - from)) / 3600000)
  const drunk = entries.filter((e) => e.ts <= atTs).sort((a, b) => a.ts - b.ts)
  let level = 0
  let at = drunk.length ? drunk[0].ts : atTs
  for (const e of drunk) {
    level = burn(level, at, e.ts) + entryGrams(e) * perGram
    at = e.ts
  }
  return burn(level, at, atTs)
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
 * The BAC_ZONES band a ‰ value falls in. Rounds to the two decimals the UI
 * displays first, so the label always agrees with the number next to it
 * (0.199 shows as "0.20" and must read "Tipsy", not "Light").
 */
export function bacZone(bac) {
  const v = Math.round((bac || 0) * 100) / 100
  if (v <= 0) return BAC_ZONES[0]
  return (
    BAC_ZONES.find((z) => z.id !== 'sober' && v < z.max) || BAC_ZONES.at(-1)
  )
}

/**
 * Timestamp at which a current BAC of `bac` ‰ burns off to zero at the
 * linear BURN_RATE, or null when already sober.
 */
export function soberAt(bac, nowTs) {
  if (!(bac > 0)) return null
  return nowTs + (bac / BURN_RATE) * 3600000
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
