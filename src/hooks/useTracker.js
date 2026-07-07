import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadData, saveData, defaultData } from '../lib/storage.js'
import { dateKey } from '../lib/datetime.js'
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
  const [data, setData] = useState(loadData)
  const [now, setNow] = useState(() => Date.now())
  const dataRef = useRef(data)
  dataRef.current = data

  // Re-tick every 20s so time-dependent estimates (BAC decay, "sober by",
  // day rollover) stay fresh without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20000)
    return () => clearInterval(id)
  }, [])

  const mutate = useCallback((fn) => {
    setData((prev) => {
      const next = clone(prev || defaultData())
      fn(next)
      saveData(next)
      return next
    })
  }, [])

  const ensureDay = (d, key) => {
    if (!d.days[key]) d.days[key] = { limit: DEFAULT_LIMIT, entries: [] }
    return d.days[key]
  }

  const todayKey = useCallback(() => dateKey(Date.now()), [])

  const addDrink = useCallback(
    (type) => {
      const sizes = dataRef.current.sizes || DEFAULT_SIZES
      const size = sizes[type] || DEFAULT_SIZES[type]
      const entry = {
        id: makeId(),
        type,
        ml: size.ml,
        abv: size.abv,
        ts: Date.now(),
      }
      mutate((d) => {
        ensureDay(d, dateKey(entry.ts)).entries.push(entry)
      })
      return entry.id
    },
    [mutate],
  )

  const addCustomDrink = useCallback(
    ({ type, cl, abv }) => {
      const entry = {
        id: makeId(),
        type,
        ml: (parseFloat(cl) || 0) * 10,
        abv: (parseFloat(abv) || 0) / 100,
        ts: Date.now(),
      }
      mutate((d) => {
        ensureDay(d, dateKey(entry.ts)).entries.push(entry)
      })
      return entry.id
    },
    [mutate],
  )

  const removeDrink = useCallback(
    (id) => {
      const key = todayKey()
      mutate((d) => {
        if (d.days[key]) {
          d.days[key].entries = d.days[key].entries.filter((e) => e.id !== id)
        }
      })
    },
    [mutate, todayKey],
  )

  const changeLimit = useCallback(
    (delta) => {
      const key = todayKey()
      mutate((d) => {
        const day = ensureDay(d, key)
        day.limit = Math.max(0, (day.limit || 0) + delta)
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

  const actions = useMemo(
    () => ({
      addDrink,
      addCustomDrink,
      removeDrink,
      changeLimit,
      setProfile,
      setSize,
      resetSizes,
    }),
    [
      addDrink,
      addCustomDrink,
      removeDrink,
      changeLimit,
      setProfile,
      setSize,
      resetSizes,
    ],
  )

  return { data, now, actions }
}
