// Data portability: JSON backup export/import and CSV export.
//
// Pure helpers (serialize / validate / merge / CSV) carry no DOM or Capacitor
// dependency and stay unit-test friendly. The file I/O lives behind a single
// `saveOrShareFile` sink that branches web-vs-native, modelled on
// `lib/haptics.js`: a browser download on web, the OS share sheet on native.

import { Capacitor } from '@capacitor/core'
import { migrate } from './storage.js'
import { dateKey, formatTime } from './datetime.js'
import { entryGrams } from './alcohol.js'
import { LABELS } from './constants.js'

const isNative = Capacitor.isNativePlatform()

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/** Pretty-printed JSON of the whole persisted object. */
export function serialize(data) {
  return JSON.stringify(data, null, 2)
}

/**
 * Throw a friendly error if `obj` isn't a plausible backup. A valid file is an
 * object with a `days` object; a missing `version` is tolerated because
 * `migrate` backfills it. Returns the object on success.
 */
export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error("This file isn't a Neon Tracker backup.")
  }
  if (!obj.days || typeof obj.days !== 'object') {
    throw new Error('Backup is missing its day data — it may be corrupt.')
  }
  return obj
}

/**
 * Merge an imported backup into `current`, returning `{ data, mergedEntries }`.
 *
 * The import is migrated to the current schema first, then folded into a clone
 * of the local data:
 *   - entries: unioned per logical-day key by `id`; on an `id` collision the
 *     entry with the larger `ts` wins ("keep the newer entry"), then each day
 *     is re-sorted by `ts`.
 *   - day.limit: an existing local day keeps its limit; a day only present in
 *     the import brings its own.
 *   - profile / sizes: the import wins — importing a backup means "restore my
 *     setup", so the saved weight/sex and drink sizes take over.
 * `mergedEntries` counts entries that were newly added or replaced a collision.
 */
export function mergeBackup(current, imported) {
  const inc = migrate(clone(imported))
  const out = clone(current)
  let mergedEntries = 0

  for (const [key, incDay] of Object.entries(inc.days)) {
    const localDay = out.days[key]
    if (!localDay) {
      out.days[key] = clone(incDay)
      mergedEntries += (incDay.entries || []).length
      continue
    }
    const byId = new Map(localDay.entries.map((e) => [e.id, e]))
    for (const e of incDay.entries || []) {
      const existing = byId.get(e.id)
      if (!existing || e.ts > existing.ts) {
        byId.set(e.id, e)
        mergedEntries++
      }
    }
    localDay.entries = [...byId.values()].sort((a, b) => a.ts - b.ts)
    // Local day keeps its own limit; nothing to do.
  }

  out.profile = clone(inc.profile)
  out.sizes = clone(inc.sizes)
  out.version = inc.version

  return { data: out, mergedEntries }
}

/** Escape a value for a CSV cell (RFC-4180 style double-quoting). */
function csvCell(value) {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * All logged entries as a CSV string, days and entries in chronological order.
 * Columns: date, time, type, cl, abv_percent, grams.
 */
export function entriesToCsv(data) {
  const rows = [['date', 'time', 'type', 'cl', 'abv_percent', 'grams']]
  const dayKeys = Object.keys(data.days || {}).sort()
  for (const key of dayKeys) {
    const entries = [...(data.days[key].entries || [])].sort(
      (a, b) => a.ts - b.ts,
    )
    for (const e of entries) {
      rows.push([
        key,
        formatTime(e.ts),
        LABELS[e.type] || e.type,
        Math.round(e.ml / 10),
        Math.round(e.abv * 100),
        Math.round(entryGrams(e)),
      ])
    }
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n')
}

/**
 * Persist a generated file: a browser download on web, the OS share sheet on
 * native. The native branch imports its plugins lazily so the web bundle never
 * pulls them in.
 */
async function saveOrShareFile({ filename, mime, content }) {
  if (!isNative) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return
  }
  const { Filesystem, Directory, Encoding } =
    await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')
  await Filesystem.writeFile({
    path: filename,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  })
  const { uri } = await Filesystem.getUri({
    path: filename,
    directory: Directory.Cache,
  })
  await Share.share({ url: uri, title: filename })
}

function stampedName(prefix, ext) {
  return `${prefix}-${dateKey(Date.now())}.${ext}`
}

/** Export the whole persisted object as a JSON backup file. */
export function exportBackup(data) {
  return saveOrShareFile({
    filename: stampedName('neon-tracker-backup', 'json'),
    mime: 'application/json',
    content: serialize(data),
  })
}

/** Export all entries as a CSV file. */
export function exportEntriesCsv(data) {
  return saveOrShareFile({
    filename: stampedName('neon-tracker-entries', 'csv'),
    mime: 'text/csv',
    content: entriesToCsv(data),
  })
}

/**
 * Prompt for a JSON backup file and return the parsed, validated object — or
 * `null` if the user cancelled the picker. A hidden `<input type="file">` opens
 * the native picker inside both the Android and iOS WebViews, so no extra
 * plugin is needed. Throws (with a friendly message) on unreadable/invalid JSON.
 */
export function importBackupFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.style.display = 'none'

    // `cancel` fires on supporting browsers; the focus fallback covers the rest.
    let settled = false
    const done = (fn, arg) => {
      if (settled) return
      settled = true
      input.remove()
      fn(arg)
    }

    input.addEventListener('cancel', () => done(resolve, null))
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0]
      if (!file) return done(resolve, null)
      try {
        const obj = validateBackup(JSON.parse(await file.text()))
        done(resolve, obj)
      } catch (err) {
        done(
          reject,
          err instanceof SyntaxError
            ? new Error("Couldn't read that file — it isn't valid JSON.")
            : err,
        )
      }
    })

    document.body.appendChild(input)
    input.click()
  })
}
