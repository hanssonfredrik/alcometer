import { useMemo } from 'react'
import { totalGrams, peakBac, computeStreaks } from '../lib/alcohol.js'
import { dateKey, addDays, startOfWeek } from '../lib/datetime.js'
import {
  WEEKDAYS,
  MONTHS,
  MILESTONES,
  STD_GLASS_GRAMS,
} from '../lib/constants.js'
import styles from './HistoryScreen.module.css'

export default function HistoryScreen({ data, now }) {
  const v = useMemo(() => {
    const days = data.days
    const profile = data.profile
    const today = new Date(now)

    // 12-day bar chart (count height + peak-BAC marker). Stepped over logical
    // days from noon of today's logical day, so each bar's bucket and weekday
    // label agree (raw `now - i·DAY_MS` drifts by one near the 05:00 cutoff).
    const anchor = new Date(dateKey(now) + 'T12:00:00').getTime()
    const window = []
    for (let i = 11; i >= 0; i--) {
      const ts = addDays(anchor, -i)
      const d = days[dateKey(ts)] || { entries: [] }
      window.push({
        count: d.entries.length,
        peak: peakBac(d.entries, profile),
        weekday: WEEKDAYS[new Date(ts).getDay()],
        isToday: i === 0,
      })
    }
    const maxCount = Math.max(1, ...window.map((b) => b.count))
    const maxPeak = Math.max(0.5, ...window.map((b) => b.peak))
    const bars = window.map((b) => ({
      weekday: b.weekday,
      heightPct: Math.round((b.count / maxCount) * 100),
      showPeak: b.peak > 0,
      peakPct: Math.min(100, Math.round((b.peak / maxPeak) * 100)),
      isToday: b.isToday,
    }))

    // Week totals — Monday–Sunday of the current week.
    let weekCount = 0
    let weekGrams = 0
    const monday = startOfWeek(now)
    for (let i = 0; i < 7; i++) {
      const d = days[dateKey(addDays(monday, i))]
      if (d) {
        weekCount += d.entries.length
        weekGrams += totalGrams(d.entries)
      }
    }
    // Month totals — current calendar month. Keys are local-zone `YYYY-MM-DD`,
    // so match on the `YYYY-MM` prefix rather than re-parsing (UTC) with Date.
    let monthCount = 0
    let monthGrams = 0
    const monthKey = dateKey(now).slice(0, 7)
    Object.keys(days).forEach((k) => {
      if (k.slice(0, 7) === monthKey) {
        monthCount += days[k].entries.length
        monthGrams += totalGrams(days[k].entries)
      }
    })

    // 6-month overview.
    const monthAgg = []
    for (let i = 5; i >= 0; i--) {
      const m = new Date(today.getFullYear(), today.getMonth() - i, 1)
      // Build the YYYY-MM key straight from the month — don't route it through
      // dateKey(), whose 05:00 logical shift would roll the 1st at 00:00 back
      // into the previous month and misbucket the whole column.
      const mKey =
        m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0')
      let count = 0
      let grams = 0
      Object.keys(days).forEach((k) => {
        if (k.slice(0, 7) === mKey) {
          count += days[k].entries.length
          grams += totalGrams(days[k].entries)
        }
      })
      monthAgg.push({
        label: MONTHS[m.getMonth()],
        count,
        grams,
        isNow: i === 0,
      })
    }
    const maxMonth = Math.max(1, ...monthAgg.map((m) => m.count))
    const monthBars = monthAgg.map((m) => ({
      label: m.label,
      count: m.count,
      std: (m.grams / STD_GLASS_GRAMS).toFixed(0),
      widthPct: Math.round((m.count / maxMonth) * 100),
      isNow: m.isNow,
    }))

    // Awards.
    const streak = computeStreaks(days, now)
    const achievements = MILESTONES.map((m) => ({
      key: `m${m.d}`,
      icon: m.icon,
      label: m.label,
      desc: m.desc,
      earned: streak.longest >= m.d,
    }))
    const safeNight = Object.keys(days).some((k) => {
      const d = days[k]
      return d.entries.length > 0 && d.entries.length <= (d.limit || 0)
    })
    achievements.push({
      key: 'safe',
      icon: '✓',
      label: 'Home safe',
      desc: 'Finished a night out within your set limit.',
      earned: safeNight,
    })
    const earnedCount = achievements.filter((a) => a.earned).length

    return {
      weekCount,
      weekStd: (weekGrams / STD_GLASS_GRAMS).toFixed(0),
      monthCount,
      monthStd: (monthGrams / STD_GLASS_GRAMS).toFixed(0),
      bars,
      monthBars,
      achievements,
      earnedCount,
      totalAwards: achievements.length,
    }
  }, [data, now])

  return (
    <div>
      <div className={styles.summaryRow}>
        <div className={styles.summary}>
          <div className={styles.summaryLabel}>This week</div>
          <div className={styles.summaryNum}>{v.weekCount}</div>
          <div className={styles.summaryStd}>{v.weekStd} std</div>
        </div>
        <div className={styles.summary}>
          <div className={styles.summaryLabel}>This month</div>
          <div className={styles.summaryNum}>{v.monthCount}</div>
          <div className={styles.summaryStd}>{v.monthStd} std</div>
        </div>
      </div>

      {/* 12-day bars */}
      <section className={styles.chartCard}>
        <div className={styles.chartHead}>
          <div className={styles.chartTitle}>Last 12 days</div>
          <div className={styles.legend}>
            <span className={styles.legendMark} />
            <span className={styles.legendText}>peak ‰</span>
          </div>
        </div>
        <div className={styles.bars}>
          {v.bars.map((b, i) => (
            <div key={i} className={styles.barCol}>
              <div className={styles.barTrack}>
                <div
                  className={styles.bar}
                  style={{
                    height: `${b.heightPct}%`,
                    background: b.isToday
                      ? 'var(--accent)'
                      : 'rgba(255,255,255,.22)',
                  }}
                />
                {b.showPeak && (
                  <div
                    className={styles.peakMark}
                    style={{ bottom: `${b.peakPct}%` }}
                  />
                )}
              </div>
              <div
                className={styles.barLabel}
                style={{ color: b.isToday ? 'var(--accent)' : 'var(--w-30)' }}
              >
                {b.weekday}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Monthly overview */}
      <section className={styles.monthCard}>
        <div className={styles.monthTitle}>Monthly overview</div>
        {v.monthBars.map((m, i) => (
          <div key={i} className={styles.monthRow}>
            <div
              className={styles.monthLabel}
              style={{ color: m.isNow ? 'var(--accent)' : 'var(--w-50)' }}
            >
              {m.label}
            </div>
            <div className={styles.monthTrack}>
              <div
                className={styles.monthFill}
                style={{
                  width: `${m.widthPct}%`,
                  background: m.isNow
                    ? 'var(--accent)'
                    : 'rgba(255,255,255,.28)',
                }}
              />
            </div>
            <div className={styles.monthValue}>
              <span className={styles.monthCount}>{m.count}</span> · {m.std} std
            </div>
          </div>
        ))}
      </section>

      {/* Awards */}
      <div className={styles.sectionLabel}>
        AWARDS · {v.earnedCount}/{v.totalAwards}
      </div>
      <div className={styles.awardGrid}>
        {v.achievements.map((a) => (
          <div key={a.key} className={styles.award} data-earned={a.earned}>
            <div className={styles.awardHead}>
              <div className={styles.awardIcon} data-earned={a.earned}>
                {a.icon}
              </div>
              <div className={styles.awardStatus} data-earned={a.earned}>
                {a.earned ? 'EARNED' : 'LOCKED'}
              </div>
            </div>
            <div className={styles.awardLabel} data-earned={a.earned}>
              {a.label}
            </div>
            <div className={styles.awardDesc}>{a.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
