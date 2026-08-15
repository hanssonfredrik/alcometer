import { useEffect } from 'react'
import styles from './DayDetailModal.module.css'

/**
 * Read-only modal showing what was logged on one day — opened from the
 * Insights heatmap. `day` is a fully formatted view object (see `dayView` in
 * InsightsScreen); this component only renders it.
 */
export default function DayDetailModal({ day, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={`Log for ${day.rel} ${day.dateLabel}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <div className={styles.headText}>
            <div className={styles.rel}>{day.rel}</div>
            <div className={styles.date}>{day.dateLabel}</div>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {day.count > 0 ? (
          <>
            <div className={styles.statRow}>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Drinks</div>
                <div className={styles.statValue} data-over={day.over}>
                  {day.count}
                  <span className={styles.statOf}>/ {day.limit}</span>
                </div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Std glasses</div>
                <div className={styles.statValue}>{day.std}</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Peak ‰</div>
                <div className={styles.statValue}>{day.peak}</div>
              </div>
            </div>

            <div className={`${styles.log} scrollArea`}>
              {day.entries.map((e) => (
                <div key={e.id} className={styles.logRow}>
                  <span className={styles.logDot} />
                  <div className={styles.logMain}>
                    <div className={styles.logType}>{e.typeLabel}</div>
                    <div className={styles.logMeta}>
                      {e.cl} cl · {e.abv}% · {e.grams} g
                    </div>
                  </div>
                  <div className={styles.logTime}>{e.timeLabel}</div>
                </div>
              ))}
            </div>

            <div className={styles.foot}>
              {day.over
                ? `${day.count - day.limit} over that day's limit of ${day.limit}.`
                : `Within that day's limit of ${day.limit}.`}
              {' · '}
              {day.grams} g pure alcohol
            </div>
          </>
        ) : (
          <div className={styles.sober}>
            <div className={styles.soberMark}>✓</div>
            <div className={styles.soberText}>
              Alcohol-free day — nothing logged.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
