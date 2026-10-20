import { DRINK_TYPES, LABELS, SIZE_PRESETS_CL } from './constants.js'

/**
 * Size options for the log sheet: the common pours for `type` with the
 * user's configured default merged in and flagged, de-duplicated, ascending.
 * Returns [{ cl, isDefault }].
 */
export function sizeChips(type, sizes) {
  const def = Math.round((sizes?.[type]?.ml ?? 0) / 10)
  const set = new Set(SIZE_PRESETS_CL[type] || [])
  if (def > 0) set.add(def)
  return [...set]
    .sort((a, b) => a - b)
    .map((cl) => ({ cl, isDefault: cl === def }))
}

/**
 * The type of the most recently timestamped entry across all days, so the
 * log sheet opens on what the user usually drinks. Falls back to the first
 * drink type when nothing has been logged.
 */
export function lastDrinkType(days) {
  let best = null
  for (const day of Object.values(days || {})) {
    for (const e of day.entries || []) {
      if (!best || e.ts > best.ts) best = e
    }
  }
  return best && DRINK_TYPES.includes(best.type) ? best.type : DRINK_TYPES[0]
}

/**
 * "beer, 33 cl": a drink mid-sentence ("Add beer, 33 cl", "Logged beer,
 * 33 cl"). Used by the log sheet's confirm button and the undo toast.
 */
export function describeDrink({ type, cl }) {
  return `${(LABELS[type] || type).toLowerCase()}, ${cl} cl`
}
