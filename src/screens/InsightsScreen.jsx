import { useMemo } from 'react'
import { weekdayAverages, heatmapGrid, weeklyTrend } from '../lib/insights.js'
import { WEEKDAYS } from '../lib/constants.js'
import styles from './InsightsScreen.module.css'

// Display order: Monday-first (getDay is Sunday-first).
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0]

export default function InsightsScreen({ data, now }) {
  const v = useMemo(() => {
    const days = data.days
    const target = data.profile.weeklyTarget || 0

    const grid = heatmapGrid(days, now, 12)

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

    return {
      grid,
      weekdays: weekdays.map((w) => ({
        ...w,
        widthPct: Math.round((w.count / maxWd) * 100),
      })),
      busiest,
      hasWeekday: weekdays.some((w) => w.count > 0),
      trend,
      target,
    }
  }, [data, now])

  const t = v.trend
  const arrow = t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→'
  const targetPct =
    v.target > 0 ? Math.min(100, Math.round((t.current / v.target) * 100)) : 0

  return (
    <div>
      {/* Calendar heatmap */}
      <section className={styles.card}>
        <div className={styles.cardTitle}>Last 12 weeks</div>
        <div className={styles.heatHead}>
          {MON_FIRST.map((day) => (
            <span key={day} className={styles.heatHeadCell}>
              {WEEKDAYS[day]}
            </span>
          ))}
        </div>
        <div className={styles.heatGrid}>
          {v.grid.flatMap((week) =>
            week.map((cell) => (
              <span
                key={cell.key}
                className={styles.heatCell}
                data-status={cell.status}
                title={
                  cell.status === 'empty'
                    ? ''
                    : `${cell.key} · ${cell.count} drink${cell.count === 1 ? '' : 's'}`
                }
              />
            )),
          )}
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendMark} data-status="sober" /> sober
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

      {/* Weekly pattern */}
      <section className={styles.card}>
        <div className={styles.cardTitle}>By weekday</div>
        {v.hasWeekday ? (
          <>
            <p className={styles.lead}>
              Your <span className={styles.em}>{fullDay(v.busiest.day)}s</span>{' '}
              average {v.busiest.count.toFixed(1)} drinks.
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
            Log a few drinks to see your weekly pattern.
          </p>
        )}
      </section>

      {/* Trends over time */}
      <section className={styles.card}>
        <div className={styles.cardTitle}>Trend</div>
        <div className={styles.trendMain}>
          <div className={styles.trendNum}>
            {t.current.toFixed(1)}
            <span className={styles.trendUnit}> std / wk</span>
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
          4-week average vs the previous four weeks ({t.previous.toFixed(1)} std
          / wk).
        </p>
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
              <span>Target {v.target} std / wk</span>
              <span className={styles.targetDelta} data-over={t.overTarget > 0}>
                {t.overTarget > 0 ? '+' : ''}
                {t.overTarget.toFixed(1)} {t.overTarget > 0 ? 'over' : 'under'}
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  )
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
