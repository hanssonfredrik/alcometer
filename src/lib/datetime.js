// Local-date helpers. All keys are `YYYY-MM-DD` in the device's local zone.

export function dateKey(ts) {
  const d = new Date(ts)
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

// Integer day index for a date key, used for streak arithmetic.
// Anchored at local noon to avoid DST edge cases.
export function dayIndex(key) {
  return Math.round(new Date(key + 'T12:00:00').getTime() / 86400000)
}

export function formatTime(ts) {
  const d = new Date(ts)
  return (
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  )
}

export const DAY_MS = 86400000
