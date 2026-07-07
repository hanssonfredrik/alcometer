import { useMemo, useState } from 'react'
import {
  entryGrams,
  totalGrams,
  bacAt,
  peakBac,
  computeStreaks,
  nextMilestone,
} from '../lib/alcohol.js'
import { dateKey, formatTime } from '../lib/datetime.js'
import { DRINK_TYPES, LABELS, STD_GLASS_GRAMS, BURN_RATE } from '../lib/constants.js'
import styles from './TodayScreen.module.css'

function streakCopy(streak, count, next) {
  if (count > 0) {
    return {
      headline: 'Streak paused tonight',
      sub: `Longest dry run: ${streak.longest} day${
        streak.longest === 1 ? '' : 's'
      }. A fresh streak starts on your next alcohol-free day.`,
    }
  }
  if (!streak.ever) {
    return {
      headline: 'Sober-day streak',
      sub: 'Log a drink to start tracking. Alcohol-free days build your streak and unlock awards.',
    }
  }
  if (next) {
    return {
      headline: `${streak.current} sober day${streak.current === 1 ? '' : 's'}`,
      sub: `${next.d - streak.current} more to “${next.label}”.`,
    }
  }
  return {
    headline: `${streak.current} sober days`,
    sub: 'Every milestone cleared. Legendary.',
  }
}

export default function TodayScreen({
  data,
  now,
  actions,
  undoEntry,
  onLogDrink,
  onLogCustom,
  onRemoveDrink,
  onUndo,
}) {
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState({ type: 'wine', cl: 15, abv: 12 })

  const v = useMemo(() => {
    const profile = data.profile
    const day = data.days[dateKey(now)] || { limit: 5, entries: [] }
    const entries = day.entries
    const count = entries.length
    const grams = totalGrams(entries)
    const bac = bacAt(entries, now, profile)
    const peak = peakBac(entries, profile, now)
    const limit = day.limit || 0
    const over = limit > 0 && count > limit
    const soberHours = bac > 0 ? bac / BURN_RATE : 0

    const streak = computeStreaks(data.days, now)
    const next = nextMilestone(streak.current)

    return {
      count,
      limit,
      over,
      overBy: `${Math.max(0, count - limit)} ${
        count - limit === 1 ? 'drink' : 'drinks'
      }`,
      limitPct: limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 0,
      remaining: Math.max(0, limit - count),
      std: (grams / STD_GLASS_GRAMS).toFixed(1),
      grams: Math.round(grams),
      bac: bac.toFixed(2),
      peak: peak.toFixed(2),
      soberBy: bac > 0 ? formatTime(now + soberHours * 3600000) : '—',
      streak,
      streakPct: next
        ? Math.min(100, Math.round((streak.current / next.d) * 100))
        : 100,
      ...streakCopy(streak, count, next),
      entries: [...entries].reverse().map((e) => ({
        id: e.id,
        typeLabel: LABELS[e.type] || e.type,
        cl: Math.round(e.ml / 10),
        abv: Math.round(e.abv * 100),
        grams: entryGrams(e).toFixed(0),
        timeLabel: formatTime(e.ts),
      })),
      defs: DRINK_TYPES.reduce((acc, t) => {
        const s = data.sizes[t]
        acc[t] = { cl: Math.round(s.ml / 10), abv: Math.round(s.abv * 100) }
        return acc
      }, {}),
    }
  }, [data, now])

  const submitCustom = () => {
    onLogCustom(custom)
    setCustomOpen(false)
  }

  return (
    <div>
      {v.over && (
        <div className={styles.alert} role="alert">
          <div className={styles.alertMark}>!</div>
          <div className={styles.alertText}>
            Over tonight&apos;s limit by {v.overBy}. Maybe slow down.
          </div>
        </div>
      )}

      {/* Count / limit hero card */}
      <section className={styles.hero}>
        <div className={styles.heroCount}>
          <span
            className={styles.countNum}
            style={{ color: v.over ? 'var(--danger-text)' : 'var(--text-strong)' }}
          >
            {v.count}
          </span>
          <span className={styles.countOf}>/ {v.limit} drinks</span>
        </div>
        <div className={styles.track}>
          <div
            className={styles.trackFill}
            style={{
              width: `${v.limitPct}%`,
              background: v.over ? 'var(--danger-bar)' : 'var(--accent)',
            }}
          />
        </div>
        <div className={styles.heroFoot}>
          <span>{v.remaining} left tonight</span>
          <span>{v.std} std glasses</span>
        </div>
      </section>

      {/* Stat cards */}
      <div className={styles.statRow}>
        <div className={`${styles.stat} ${styles.statWide}`}>
          <div className={styles.statLabel}>Blood alcohol</div>
          <div className={styles.statValue}>
            <span className={styles.statNumAccent}>{v.bac}</span>
            <span className={styles.statUnit}>‰</span>
          </div>
          <div className={styles.statSub}>
            peak {v.peak} · sober ~{v.soberBy}
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Pure alcohol</div>
          <div className={styles.statValue}>
            <span className={styles.statNum}>{v.grams}</span>
            <span className={styles.statUnit}>g</span>
          </div>
          <div className={styles.statSub}>today</div>
        </div>
      </div>

      {/* Streak progress */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}>{v.headline}</div>
          <div className={styles.best}>best {v.streak.longest}d</div>
        </div>
        <div className={styles.trackThin}>
          <div className={styles.trackThinFill} style={{ width: `${v.streakPct}%` }} />
        </div>
        <div className={styles.cardSub}>{v.sub}</div>
      </section>

      {/* Limit stepper */}
      <section className={styles.limitRow}>
        <div className={styles.limitLabel}>Tonight&apos;s limit</div>
        <button
          className={styles.stepper}
          onClick={() => actions.changeLimit(-1)}
          aria-label="Decrease limit"
        >
          −
        </button>
        <span className={styles.limitValue}>{v.limit}</span>
        <button
          className={styles.stepper}
          onClick={() => actions.changeLimit(1)}
          aria-label="Increase limit"
        >
          +
        </button>
      </section>

      {/* Quick log */}
      <div className={styles.sectionLabel}>LOG A DRINK</div>
      <div className={styles.quickGrid}>
        {DRINK_TYPES.map((type) => (
          <button
            key={type}
            className={styles.quickBtn}
            onClick={() => onLogDrink(type)}
          >
            <div className={styles.quickName}>{LABELS[type]}</div>
            <div className={styles.quickMeta}>{v.defs[type].cl}cl</div>
          </button>
        ))}
      </div>

      <button
        className={styles.customToggle}
        onClick={() => setCustomOpen((o) => !o)}
      >
        {customOpen ? 'Close custom' : '+ Custom size'}
      </button>

      {customOpen && (
        <div className={styles.customPanel}>
          <div className={styles.typeRow}>
            {DRINK_TYPES.map((type) => (
              <button
                key={type}
                className={styles.typePill}
                data-selected={custom.type === type}
                onClick={() => setCustom((c) => ({ ...c, type }))}
              >
                {LABELS[type]}
              </button>
            ))}
          </div>
          <div className={styles.customFields}>
            <label className={styles.field}>
              Size (cl)
              <input
                type="number"
                inputMode="decimal"
                value={custom.cl}
                onChange={(e) => setCustom((c) => ({ ...c, cl: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              Strength (%)
              <input
                type="number"
                inputMode="decimal"
                value={custom.abv}
                onChange={(e) => setCustom((c) => ({ ...c, abv: e.target.value }))}
              />
            </label>
          </div>
          <button className={styles.addBtn} onClick={submitCustom}>
            Add drink
          </button>
        </div>
      )}

      {undoEntry && (
        <div className={styles.undoBar}>
          <span className={styles.undoText}>
            Logged {LABELS[undoEntry.type]}
          </span>
          <button className={styles.undoBtn} onClick={onUndo}>
            Undo
          </button>
        </div>
      )}

      {/* Today's log */}
      {v.entries.length > 0 ? (
        <div className={styles.logSection}>
          <div className={styles.sectionLabel}>TODAY&apos;S LOG</div>
          {v.entries.map((e) => (
            <div key={e.id} className={styles.logRow}>
              <span className={styles.logDot} />
              <div className={styles.logMain}>
                <div className={styles.logType}>{e.typeLabel}</div>
                <div className={styles.logMeta}>
                  {e.cl} cl · {e.abv}% · {e.grams} g
                </div>
              </div>
              <div className={styles.logTime}>{e.timeLabel}</div>
              <button
                className={styles.logRemove}
                onClick={() => onRemoveDrink(e.id)}
                aria-label={`Remove ${e.typeLabel}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Nothing logged yet tonight.</div>
      )}
    </div>
  )
}
