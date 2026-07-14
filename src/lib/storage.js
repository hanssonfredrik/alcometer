import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import {
  DEFAULT_SIZES,
  DEFAULT_PROFILE,
  DEFAULT_LIMIT,
  STORAGE_KEY,
} from './constants.js'
import { dateKey } from './datetime.js'

// Bump when the persisted shape changes; drives the migration ladder below.
const SCHEMA_VERSION = 2

// On web, localStorage is durable and synchronous — keep using it unchanged.
// Inside the Capacitor shell, WebView localStorage is treated as a cache the
// OS may evict under disk pressure, so native builds persist through the
// Preferences plugin (UserDefaults / SharedPreferences) instead.
const isNative = Capacitor.isNativePlatform()

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function defaultData() {
  return {
    version: SCHEMA_VERSION,
    profile: { ...DEFAULT_PROFILE },
    sizes: clone(DEFAULT_SIZES),
    days: {},
  }
}

/**
 * v1 → v2: entries were bucketed by calendar date; re-bucket them by logical
 * day (`dateKey` now rolls at 05:00), so a night running past midnight lands in
 * one bucket. Idempotent: on already-logical data every entry maps to its own
 * bucket, so nothing moves.
 */
function migrateToLogicalDays(d) {
  const rebuilt = {}
  for (const day of Object.values(d.days)) {
    for (const e of day.entries || []) {
      const k = dateKey(e.ts)
      // Limit for logical key K comes from the same-date old bucket — that's
      // where the user set that evening's limit. A calendar day with only
      // early-morning entries loses its own limit (a soft nightly target).
      if (!rebuilt[k]) {
        rebuilt[k] = { limit: d.days[k]?.limit ?? DEFAULT_LIMIT, entries: [] }
      }
      rebuilt[k].entries.push(e)
    }
  }
  for (const day of Object.values(rebuilt)) {
    day.entries.sort((a, b) => a.ts - b.ts)
  }
  d.days = rebuilt
}

async function readRaw() {
  if (!isNative) return localStorage.getItem(STORAGE_KEY)
  const { value } = await Preferences.get({ key: STORAGE_KEY })
  if (value != null) return value
  // One-time migration: data written by an older build (or the WebView)
  // may still live in localStorage — promote it to native storage.
  const legacy = localStorage.getItem(STORAGE_KEY)
  if (legacy != null) await Preferences.set({ key: STORAGE_KEY, value: legacy })
  return legacy
}

/**
 * Load persisted state, backfilling any missing top-level keys so older
 * or partial saves stay usable.
 */
export async function loadData() {
  try {
    const raw = await readRaw()
    if (raw) {
      const d = JSON.parse(raw)
      if (!d.sizes) d.sizes = clone(DEFAULT_SIZES)
      if (!d.profile) d.profile = { ...DEFAULT_PROFILE }
      if (!d.days) d.days = {}
      if ((d.version || 1) < 2) {
        migrateToLogicalDays(d)
        d.version = 2
      }
      return d
    }
  } catch {
    // Corrupt or unavailable storage — fall through to defaults.
  }
  return defaultData()
}

/** Fire-and-forget persist; callers never await it. */
export function saveData(data) {
  try {
    const json = JSON.stringify(data)
    if (isNative) {
      Preferences.set({ key: STORAGE_KEY, value: json }).catch(() => {})
    } else {
      localStorage.setItem(STORAGE_KEY, json)
    }
  } catch {
    // Storage may be full or blocked (private mode); ignore.
  }
}
