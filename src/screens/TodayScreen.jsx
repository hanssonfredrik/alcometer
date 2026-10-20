import { useCallback, useMemo, useState } from 'react'
import { totalGrams, bacAt, peakBac, bacZone, soberAt } from '../lib/alcohol.js'
import { dateKey, dayIndex, addDays, formatTime } from '../lib/datetime.js'
import { lastDrinkType } from '../lib/drinks.js'
import { curveWindow, curveGeometry, CURVE_W, CURVE_H } from '../lib/charts.js'
import {
  LABELS,
  DRINK_ICONS,
  MONTHS,
  STD_GLASS_GRAMS,
  DEFAULT_LIMIT,
} from '../lib/constants.js'
import BacHero from '../components/BacHero.jsx'
import BacCurve from '../components/BacCurve.jsx'
import DrinkRow from '../components/DrinkRow.jsx'
import LogDrinkSheet from '../components/LogDrinkSheet.jsx'
import EditDrinkModal from '../components/EditDrinkModal.jsx'
import styles from './TodayScreen.module.css'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function dayLabels(offset, ts, nowTs) {
  const d = new Date(ts)
  const dateStr =
    d.getFullYear() === new Date(nowTs).getFullYear()
      ? `${d.getDate()} ${MONTHS[d.getMonth()]}`
      : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  // `rel` is the pager title ("Yesterday", "Sun"); `relPhrase` reads inside
  // a sentence ("for yesterday", "to Sunday").
  let rel, relPhrase
  if (offset === 0) {
    rel = 'Today'
    relPhrase = 'today'
  } else if (offset === -1) {
    rel = 'Yesterday'
    relPhrase = 'yesterday'
  } else {
    rel = DOW[d.getDay()]
    relPhrase = DOW_LONG[d.getDay()]
  }
  return { rel, relPhrase, dateStr }
}

export default function TodayScreen({
  data,
  now,
  actions,
  onLogDrink,
  onRemoveDrink,
}) {
  const [logOpen, setLogOpen] = useState(false)
  // Entry being edited: { id, key, type, cl, abv, time } or null.
  const [editing, setEditing] = useState(null)
  // 0 = today, negative = previous days.
  const [dayOffset, setDayOffset] = useState(0)

  // Earliest day we let the user page back to: the first day with any entry,
  // but always at least 30 days so a forgotten drink can be backfilled onto a
  // day that has nothing logged yet.
  const minOffset = useMemo(() => {
    const logged = Object.keys(data.days).filter(
      (k) => data.days[k].entries.length > 0,
    )
    const earliest = logged.length
      ? Math.min(...logged.map(dayIndex)) - dayIndex(dateKey(now))
      : 0
    return Math.min(earliest, -30)
  }, [data.days, now])

  const isToday = dayOffset === 0
  // Anchor the pager on noon of the *logical* day `now` falls in (not noon of
  // its calendar date) — otherwise at 02:00 the pager points a logical day too
  // far forward and Today reads the wrong (empty) bucket.
  const anchorTs = new Date(dateKey(now) + 'T12:00:00').getTime()
  const selectedTs = addDays(anchorTs, dayOffset)
  const selectedKey = dateKey(selectedTs)

  const v = useMemo(() => {
    const profile = data.profile
    const day = data.days[selectedKey] || { limit: DEFAULT_LIMIT, entries: [] }
    const entries = day.entries
    const count = entries.length
    const grams = totalGrams(entries)
    const bac = isToday ? bacAt(entries, now, profile) : 0
    const peak = peakBac(entries, profile, isToday ? now : undefined)
    const shown = isToday ? bac : peak
    // A limit of 0 is intentional (an alcohol-free day) — any drink is "over".
    // Only a missing limit falls back to the default; matches lib/insights.js.
    const limit = day.limit ?? DEFAULT_LIMIT
    const soberTs = soberAt(bac, now)

    // BAC over the evening; null with nothing logged (the card is hidden).
    const win = curveWindow(entries, profile, now, isToday)
    const curve = win && {
      geo: curveGeometry(entries, profile, win, { w: CURVE_W, h: CURVE_H }),
      axis: [win.from, (win.from + win.to) / 2, win.to].map(formatTime),
      soberLabel: soberTs ? formatTime(soberTs) : null,
    }

    return {
      count,
      limit,
      over: count > limit,
      std: (grams / STD_GLASS_GRAMS).toFixed(1),
      grams: Math.round(grams),
      bacValue: shown,
      bacBig: shown.toFixed(2),
      zone: bacZone(shown),
      soberLabel: soberTs ? formatTime(soberTs) : null,
      curve,
      lastType: lastDrinkType(data.days),
      entries: [...entries].reverse().map((e) => ({
        id: e.id,
        type: e.type,
        typeLabel: LABELS[e.type] || e.type,
        icon: DRINK_ICONS[e.type] || '',
        cl: Math.round(e.ml / 10),
        abv: Math.round(e.abv * 100),
        // Unrounded seeds for the edit form, so a no-op save doesn't
        // silently change stored values (4.7% displays as 5%).
        rawCl: +(e.ml / 10).toFixed(1),
        rawAbv: +(e.abv * 100).toFixed(1),
        timeLabel: formatTime(e.ts),
      })),
    }
  }, [data, now, selectedKey, isToday])

  const { rel, relPhrase, dateStr } = dayLabels(dayOffset, selectedTs, now)

  const closeLog = useCallback(() => setLogOpen(false), [])
  const closeEdit = useCallback(() => setEditing(null), [])

  return (
    <div className={styles.screen}>
      {/* Day pager */}
      <nav className={styles.dayNav} aria-label="Select day">
        <button
          className={styles.navBtn}
          onClick={() => setDayOffset((o) => o - 1)}
          disabled={dayOffset <= minOffset}
          aria-label="Previous day"
        >
          ‹
        </button>
        <button
          className={styles.dayNavLabel}
          onClick={() => setDayOffset(0)}
          disabled={isToday}
          title={isToday ? undefined : 'Jump to today'}
        >
          <span className={styles.dayNavRel}>{rel}</span>
          <span className={styles.dayNavDate}>{dateStr}</span>
        </button>
        <button
          className={styles.navBtn}
          onClick={() => setDayOffset((o) => Math.min(0, o + 1))}
          disabled={isToday}
          aria-label="Next day"
        >
          ›
        </button>
      </nav>

      <BacHero
        bac={v.bacBig}
        bacValue={v.bacValue}
        zone={v.zone}
        isToday={isToday}
        soberLabel={v.soberLabel}
        count={v.count}
        limit={v.limit}
        over={v.over}
      />

      {/* One-line summary + the limit stepper (its only home now) */}
      <div className={styles.summary}>
        <div className={styles.summaryText}>
          {v.count} {v.count === 1 ? 'drink' : 'drinks'} · {v.std} std
          <span className={styles.summaryDim}> · {v.grams} g</span>
        </div>
        <div className={styles.limitCtl}>
          <span className={styles.limitLabel}>Limit</span>
          <button
            type="button"
            className={styles.stepper}
            onClick={() => actions.changeLimit(-1, selectedKey)}
            aria-label="Decrease limit"
          >
            −
          </button>
          <span className={styles.limitValue}>{v.limit}</span>
          <button
            type="button"
            className={styles.stepper}
            onClick={() => actions.changeLimit(1, selectedKey)}
            aria-label="Increase limit"
          >
            +
          </button>
        </div>
      </div>

      {v.curve && <BacCurve curve={v.curve} isToday={isToday} />}

      {/* Log for the selected day, newest first */}
      {v.entries.length > 0 ? (
        <div className={styles.log}>
          {v.entries.map((e) => (
            <DrinkRow
              key={e.id}
              entry={e}
              onEdit={() =>
                setEditing({
                  id: e.id,
                  key: selectedKey,
                  type: e.type,
                  cl: e.rawCl,
                  abv: e.rawAbv,
                  time: e.timeLabel,
                })
              }
              onRemove={() => onRemoveDrink(e.id, selectedKey)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          {isToday ? 'Nothing logged yet tonight.' : 'Nothing logged that day.'}
        </div>
      )}

      {/* The one primary action, docked above the bottom nav: always in
          reach (thumb zone) and visible however far the list scrolls. */}
      <div className={styles.dock}>
        <button
          type="button"
          className={styles.logBtn}
          onClick={() => setLogOpen(true)}
        >
          <span className={styles.logPlus} aria-hidden="true">
            +
          </span>
          {isToday ? 'Log a drink' : `Add a drink for ${relPhrase}`}
        </button>
      </div>

      {logOpen && (
        <LogDrinkSheet
          sizes={data.sizes}
          initialType={v.lastType}
          isToday={isToday}
          dayLabel={relPhrase}
          onAdd={(drink) => {
            onLogDrink(drink, selectedKey)
            setLogOpen(false)
          }}
          onClose={closeLog}
        />
      )}

      {editing && (
        <EditDrinkModal
          entry={editing}
          onClose={closeEdit}
          onSave={(form) => {
            actions.updateDrink(editing.id, form, editing.key)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
