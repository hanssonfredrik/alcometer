// Data portability: JSON backup export/import and CSV export.
//
// Pure helpers (serialize / validate / restore / CSV) carry no DOM or Capacitor
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
    throw new Error(
      "That file isn't a Promilla backup. Choose a backup file the app saved.",
    )
  }
  if (!obj.days || typeof obj.days !== 'object') {
    throw new Error(
      "That backup is incomplete, so it can't be restored. Try another file.",
    )
  }
  return obj
}

/** Total number of logged entries across all days. */
export function countEntries(data) {
  return Object.values(data?.days || {}).reduce(
    (n, day) => n + (day.entries || []).length,
    0,
  )
}

/**
 * Turn an imported backup into the complete new persisted object, returning
 * `{ data, entries }`.
 *
 * Importing is a full restore, not a merge: whatever is on the device —
 * every logged drink, the profile, the drink sizes and the theme — is
 * discarded and replaced by the file's contents. The UI confirms this with
 * the user (see components/ImportBackupModal) before the file picker opens.
 * The file is migrated to the current schema first so an older backup never
 * strands the install; the input object is not mutated. `entries` is the
 * number of drinks the restored data holds, for the UI to report.
 */
export function restoreBackup(imported) {
  const data = migrate(clone(imported))
  for (const day of Object.values(data.days)) {
    day.entries = [...(day.entries || [])].sort((a, b) => a.ts - b.ts)
  }
  return { data, entries: countEntries(data) }
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
    filename: stampedName('promilla-backup', 'json'),
    mime: 'application/json',
    content: serialize(data),
  })
}

/** Export all entries as a CSV file. */
export function exportEntriesCsv(data) {
  return saveOrShareFile({
    filename: stampedName('promilla-entries', 'csv'),
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
            ? new Error(
                "Couldn't read that file. Choose a backup file the app saved.",
              )
            : err,
        )
      }
    })

    document.body.appendChild(input)
    input.click()
  })
}
