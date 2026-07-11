import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { DEFAULT_SIZES, DEFAULT_PROFILE, STORAGE_KEY } from './constants.js'

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
    profile: { ...DEFAULT_PROFILE },
    sizes: clone(DEFAULT_SIZES),
    days: {},
  }
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
