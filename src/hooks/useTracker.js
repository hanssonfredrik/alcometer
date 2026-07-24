import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadData, saveData, defaultData } from '../lib/storage.js'
import { mergeBackup } from '../lib/backup.js'
import { dateKey, backfillTs } from '../lib/datetime.js'
import { DEFAULT_SIZES, DEFAULT_LIMIT } from '../lib/constants.js'

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function makeId() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 6)
}

/**
 * Central store for the tracker: persisted `data`, a periodically-updated
 * `now` (so BAC/streaks recompute over time), and mutation actions.
 * Every mutation clones, applies, persists, and re-renders.
 */
export function useTracker() {
  const [data, setData] = useState(defaultData)
  const [now, setNow] = useState(() => Date.now())
  // Set when a persist fails so the UI can warn the user their change may not
  // have been saved; cleared on the next successful save (or an explicit
  // dismiss). See `saveData` in lib/storage.js.
  const [saveError, setSaveError] = useState(false)
  const dataRef = useRef(data)
  dataRef.current = data

  // Route a save promise's outcome to the `saveError` banner: clear on
  // success, raise on failure. Shared by the hydration replay and `mutate`.
  const trackSave = useCallback((promise) => {
    promise.then(
      () => setSaveError(false),
      () => setSaveError(true),
    )
  }, [])

  // Persisted data arrives asynchronously (native storage is promise-based).
  // Until it lands, mutations are queued so an early tap is neither lost nor
  // saved over the not-yet-loaded state; hydration replays the queue on top.
  const readyRef = useRef(false)
  const pendingRef = useRef([])

  useEffect(() => {
    let cancelled = false
    loadData().then((stored) => {
      if (cancelled) return
      let next = stored
      if (pendingRef.current.length) {
        next = clone(stored)
        for (const fn of pendingRef.current) fn(next)
        trackSave(saveData(next))
      }
      pendingRef.current = []
      readyRef.current = true
      setData(next)
    })
    return () => {
      cancelled = true
    }
  }, [trackSave])

  // Re-tick every 20s so time-dependent estimates (BAC decay, "sober by",
  // day rollover) stay fresh without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20000)
    return () => clearInterval(id)
  }, [])

  const mutate = useCallback(
    (fn) => {
      if (!readyRef.current) pendingRef.current.push(fn)
      setData((prev) => {
        const next = clone(prev || defaultData())
        fn(next)
        if (readyRef.current) trackSave(saveData(next))
        return next
      })
    },
    [trackSave],
  )

  const dismissSaveError = useCallback(() => setSaveError(false), [])

  const ensureDay = (d, key) => {
    if (!d.days[key]) d.days[key] = { limit: DEFAULT_LIMIT, entries: [] }
    return d.days[key]
  }

  const todayKey = useCallback(() => dateKey(Date.now()), [])

  // Timestamp for a new entry: "now" for today (or no key), a fixed evening
  // time for a backfill onto a past logical day (adjustable via edit).
  const entryTs = useCallback(
    (key) => (!key || key === todayKey() ? Date.now() : backfillTs(key)),
    [todayKey],
  )

  const addDrink = useCallback(
    (type, key) => {
      const sizes = dataRef.current.sizes || DEFAULT_SIZES
      const size = sizes[type] || DEFAULT_SIZES[type]
      const entry = {
        id: makeId(),
        type,
        ml: size.ml,
        abv: size.abv,
        ts: entryTs(key),
      }
      mutate((d) => {
        const day = ensureDay(d, dateKey(entry.ts))
        day.entries.push(entry)
        // A backfilled entry can predate existing ones; the log renders
        // entries in array order, so keep the bucket time-ordered.
        day.entries.sort((a, b) => a.ts - b.ts)
      })
      return entry.id
    },
    [mutate, entryTs],
  )

  const addCustomDrink = useCallback(
    ({ type, cl, abv }, key) => {
      const entry = {
        id: makeId(),
        type,
        ml: (parseFloat(cl) || 0) * 10,
        abv: (parseFloat(abv) || 0) / 100,
        ts: entryTs(key),
      }
      mutate((d) => {
        const day = ensureDay(d, dateKey(entry.ts))
        day.entries.push(entry)
        day.entries.sort((a, b) => a.ts - b.ts)
      })
      return entry.id
    },
    [mutate, entryTs],
  )

  const removeDrink = useCallback(
    (id, key) => {
      const dayKey = key || todayKey()
      mutate((d) => {
        if (d.days[dayKey]) {
          d.days[dayKey].entries = d.days[dayKey].entries.filter(
            (e) => e.id !== id,
          )
        }
      })
    },
    [mutate, todayKey],
  )

  const updateDrink = useCallback(
    (id, { type, cl, abv, time }, key) => {
      const dayKey = key || todayKey()
      mutate((d) => {
        const day = d.days[dayKey]
        const entry = day?.entries.find((e) => e.id === id)
        if (!entry) return
        entry.type = type
        entry.ml = (parseFloat(cl) || 0) * 10
        entry.abv = (parseFloat(abv) || 0) / 100
        // Keep the calendar date of ts and change only H:M.
        const [h, m] = String(time).split(':')
        const dt = new Date(entry.ts)
        dt.setHours(+h || 0, +m || 0, 0, 0)
        entry.ts = dt.getTime()
        const newKey = dateKey(entry.ts)
        if (newKey !== dayKey) {
          // Editing across the 05:00 boundary moves the entry to another logical
          // day (e.g. 06:00 → 03:00). Relocate it so the bucket stays truthful.
          day.entries = day.entries.filter((e) => e.id !== entry.id)
          const dest = ensureDay(d, newKey)
          dest.entries.push(entry)
          dest.entries.sort((a, b) => a.ts - b.ts)
        } else {
          // The log renders entries in array order, so keep it time-ordered.
          day.entries.sort((a, b) => a.ts - b.ts)
        }
      })
    },
    [mutate, todayKey],
  )

  const changeLimit = useCallback(
    (delta, key) => {
      const dayKey = key || todayKey()
      mutate((d) => {
        const day = ensureDay(d, dayKey)
        day.limit = Math.max(0, (day.limit ?? DEFAULT_LIMIT) + delta)
      })
    },
    [mutate, todayKey],
  )

  const setProfile = useCallback(
    (patch) => {
      mutate((d) => {
        d.profile = { ...d.profile, ...patch }
      })
    },
    [mutate],
  )

  const setTheme = useCallback(
    (id) => {
      mutate((d) => {
        d.profile = { ...d.profile, theme: id }
      })
    },
    [mutate],
  )

  const setSize = useCallback(
    (type, patch) => {
      mutate((d) => {
        d.sizes[type] = { ...d.sizes[type], ...patch }
      })
    },
    [mutate],
  )

  const resetSizes = useCallback(() => {
    mutate((d) => {
      d.sizes = clone(DEFAULT_SIZES)
    })
  }, [mutate])

  // Merge an imported backup into the current data (see lib/backup.js), then
  // persist. Returns how many entries were added/replaced so the UI can report.
  const importData = useCallback(
    (imported) => {
      let mergedEntries = 0
      mutate((d) => {
        const merged = mergeBackup(d, imported)
        Object.assign(d, merged.data)
        mergedEntries = merged.mergedEntries
      })
      return mergedEntries
    },
    [mutate],
  )

  const actions = useMemo(
    () => ({
      addDrink,
      addCustomDrink,
      removeDrink,
      updateDrink,
      changeLimit,
      setProfile,
      setTheme,
      setSize,
      resetSizes,
      importData,
    }),
    [
      addDrink,
      addCustomDrink,
      removeDrink,
      updateDrink,
      changeLimit,
      setProfile,
      setTheme,
      setSize,
      resetSizes,
      importData,
    ],
  )

  return { data, now, actions, saveError, dismissSaveError }
}
