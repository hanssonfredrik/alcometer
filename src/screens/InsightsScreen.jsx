import { useCallback, useMemo, useState } from 'react'
import {
  weekdayAverages,
  heatmapGrid,
  weeklyTrend,
  dayDetail,
} from '../lib/insights.js'
import { entryGrams } from '../lib/alcohol.js'
import { dateKey, dayIndex, formatTime } from '../lib/datetime.js'
import { WEEKDAYS, MONTHS, LABELS, DRINK_ICONS } from '../lib/constants.js'
import { sparkPath } from '../lib/charts.js'
import DayDetailModal from '../components/DayDetailModal.jsx'
import Sparkline from '../components/Sparkline.jsx'
import styles from './InsightsScreen.module.css'

// Sparkline box (SVG units; it stretches to the card).
const SPARK_W = 300
const SPARK_H = 56

// Display order: Monday-first (getDay is Sunday-first).
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0]

export default function InsightsScreen({ data, now }) {
  // Heatmap cell opened in the day-detail modal (a `YYYY-MM-DD` key), or null.
  const [openKey, setOpenKey] = useState(null)
  const closeDay = useCallback(() => setOpenKey(null), [])

  const v = useMemo(() => {
    const days = data.days
    const target = data.profile.weeklyTarget || 0

    const grid = heatmapGrid(days, now, 12)
    // Newest-first rows, each labeled with its month only at a month boundary.
    // A week's month is that of its Thursday (cells[3]) so weeks straddling a
    // month boundary land on the ISO-representative month.
    const heatWeeks = []
    let prevMonth = -1
    for (let i = grid.length - 1; i >= 0; i--) {
      const week = grid[i]
      const month = new Date(week[3].key + 'T12:00:00').getMonth()
      heatWeeks.push({
        key: week[0].key,
        cells: week.map((cell) => ({
          ...cell,
          // Out-of-range cells have nothing to show, so they stay inert.
          open: cell.status !== 'empty',
          label: cell.status === 'empty' ? '' : heatLabel(cell),
        })),
        month: month !== prevMonth ? MONTHS[month] : '',
      })
      prevMonth = month
    }

    const wd = weekdayAverages(days, now)
    const weekdays = MON_FIRST.map((day) => ({
      day,
      label: WEEKDAYS[day],
      count: wd[day].count,
      std: wd[day].std,
    }))
    const maxWd = Math.max(0.001, ...weekdays.map((w) => w.count))
    const busiest = weekdays.reduce(
      (a, b) => (b.count > a.count ? b : a),
      weekdays[0],
    )

    const trend = weeklyTrend(days, now, target, 4)
    // Headroom above the target line so it never sits on the top edge.
    const spark = sparkPath(trend.weeks, SPARK_W, SPARK_H, target * 1.25)

    return {
      heatWeeks,
      weekdays: weekdays.map((w) => ({
        ...w,
        widthPct: Math.round((w.count / maxWd) * 100),
      })),
      busiest,
      hasWeekday: weekdays.some((w) => w.count > 0),
      trend,
      target,
      spark,
      sparkTargetY: target > 0 ? spark.yOf(target) : null,
      sparkOver: target > 0 && trend.weeks.at(-1) > target,
    }
  }, [data, now])

  const openDay = useMemo(
    () => (openKey ? dayView(data, openKey, now) : null),
    [data, openKey, now],
  )

  const t = v.trend
  const arrow = t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→'
  const targetPct =
    v.target > 0 ? Math.min(100, Math.round((t.current / v.target) * 100)) : 0

  return (
    <div>
      {/* Trends over time */}
      <section className={styles.card}>
        <div className={styles.cardTitle}>Trend</div>
        <div className={styles.trendMain}>
          <div className={styles.trendNum}>
            {t.current.toFixed(1)}
            <span className={styles.trendUnit}> std a week</span>
          </div>
          <div className={styles.trendArrow} data-dir={t.direction}>
            {arrow}
            {t.direction !== 'flat' && (
              <span className={styles.trendDelta}>
                {Math.abs(Math.round(t.deltaPct))}%
              </span>
            )}
          </div>
        </div>
        <p className={styles.trendSub}>
          Average of the last 4 weeks. The 4 weeks before that averaged{' '}
          {t.previous.toFixed(1)}.
        </p>
        <Sparkline
          spark={v.spark}
          w={SPARK_W}
          h={SPARK_H}
          targetY={v.sparkTargetY}
          over={v.sparkOver}
          labels={[`${t.weeks.length} weeks ago`, 'This week']}
        />
        {v.target > 0 && (
          <>
            <div className={styles.targetTrack}>
              <div
                className={styles.targetFill}
                data-over={t.overTarget > 0}
                style={{ width: `${targetPct}%` }}
              />
            </div>
            <div className={styles.targetLine}>
              <span>Weekly target: {v.target} std</span>
              <span className={styles.targetDelta} data-over={t.overTarget > 0}>
                {Math.abs(t.overTarget).toFixed(1)} std{' '}
                {t.overTarget > 0 ? 'over' : 'under'}
              </span>
            </div>
          </>
        )}
      </section>

      {/* Weekly pattern */}
      <section className={styles.card}>
        <div className={styles.cardTitle}>By weekday</div>
        {v.hasWeekday ? (
          <>
            <p className={styles.lead}>
              Your busiest day is{' '}
              <span className={styles.em}>{fullDay(v.busiest.day)}</span>:{' '}
              {v.busiest.count.toFixed(1)} drinks on average.
            </p>
            {v.weekdays.map((w) => (
              <div key={w.day} className={styles.wdRow}>
                <div className={styles.wdLabel}>{w.label}</div>
                <div className={styles.wdTrack}>
                  <div
                    className={styles.wdFill}
                    style={{ width: `${w.widthPct}%` }}
                  />
                </div>
                <div className={styles.wdValue}>{w.count.toFixed(1)}</div>
              </div>
            ))}
          </>
        ) : (
          <p className={styles.empty}>
            Your week by day shows up here once you have logged drinks.
          </p>
        )}
      </section>

      {/* Calendar heatmap */}
      <section className={styles.card}>
        <div className={styles.cardTitle}>Last 12 weeks</div>
        <p className={styles.hint}>Tap a day to see what you logged.</p>
        <div className={styles.heatHead}>
          <span className={styles.heatHeadCell} />
          {MON_FIRST.map((day) => (
            <span key={day} className={styles.heatHeadCell}>
              {WEEKDAYS[day]}
            </span>
          ))}
        </div>
        <div className={styles.heatGrid}>
          {v.heatWeeks.flatMap((week) => [
            <span key={`m-${week.key}`} className={styles.heatMonth}>
              {week.month}
            </span>,
            ...week.cells.map((cell) =>
              cell.open ? (
                <button
                  key={cell.key}
                  type="button"
                  className={styles.heatCell}
                  data-status={cell.status}
                  title={cell.label}
                  aria-label={cell.label}
                  onClick={() => setOpenKey(cell.key)}
                />
              ) : (
                <span
                  key={cell.key}
                  className={styles.heatCell}
                  data-status={cell.status}
                />
              ),
            ),
          ])}
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendMark} data-status="sober" />{' '}
            alcohol-free
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendMark} data-status="within" /> within
            limit
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendMark} data-status="over" /> over limit
          </span>
        </div>
      </section>

      {openDay && <DayDetailModal day={openDay} onClose={closeDay} />}
    </div>
  )
}

/**
 * Formats one day for DayDetailModal: the pure aggregation from `dayDetail`
 * plus display units (cl / percent / HH:MM) and a header label.
 */
function dayView(data, key, now) {
  const d = dayDetail(data.days, key, data.profile)
  const date = new Date(key + 'T12:00:00')
  const offset = dayIndex(key) - dayIndex(dateKey(now))
  const rel =
    offset === 0
      ? 'Today'
      : offset === -1
        ? 'Yesterday'
        : FULL_DAYS[date.getDay()]
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  return {
    rel,
    dateLabel: `${date.getDate()} ${MONTHS[date.getMonth()]}${
      sameYear ? '' : ' ' + date.getFullYear()
    }`,
    count: d.count,
    limit: d.limit,
    over: d.over,
    std: d.std.toFixed(1),
    grams: Math.round(d.grams),
    peak: d.peak.toFixed(2),
    entries: d.entries.map((e) => ({
      id: e.id,
      typeLabel: LABELS[e.type] || e.type,
      icon: DRINK_ICONS[e.type] || '',
      cl: Math.round(e.ml / 10),
      abv: Math.round(e.abv * 100),
      grams: entryGrams(e).toFixed(0),
      timeLabel: formatTime(e.ts),
    })),
  }
}

const FULL_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
function fullDay(day) {
  return FULL_DAYS[day]
}

/** Screen-reader / tooltip label for a heatmap cell: "Friday 16 Oct: 3 drinks". */
function heatLabel(cell) {
  const d = new Date(cell.key + 'T12:00:00')
  const date = `${FULL_DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
  if (!cell.count) return `${date}: alcohol-free`
  return `${date}: ${cell.count} ${cell.count === 1 ? 'drink' : 'drinks'}`
}
