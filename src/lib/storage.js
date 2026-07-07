import { DEFAULT_SIZES, DEFAULT_PROFILE, STORAGE_KEY } from './constants.js'

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function defaultData() {
  return {
    profile: { ...DEFAULT_PROFILE },
    sizes: clone(DEFAULT_SIZES),
    days: {},
  }
}

/**
 * Load persisted state, backfilling any missing top-level keys so older
 * or partial saves stay usable.
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const d = JSON.parse(raw)
      if (!d.sizes) d.sizes = clone(DEFAULT_SIZES)
      if (!d.profile) d.profile = { ...DEFAULT_PROFILE }
      if (!d.days) d.days = {}
      return d
    }
  } catch {
    // Corrupt or unavailable storage — fall through to defaults.
  }
  return defaultData()
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage may be full or blocked (private mode); ignore.
  }
}
