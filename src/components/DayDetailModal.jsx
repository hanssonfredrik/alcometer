import Sheet from './Sheet.jsx'
import DrinkRow from './DrinkRow.jsx'
import styles from './DayDetailModal.module.css'

/**
 * Read-only modal showing what was logged on one day — opened from the
 * Insights heatmap. `day` is a fully formatted view object (see `dayView` in
 * InsightsScreen); this component only renders it.
 */
export default function DayDetailModal({ day, onClose }) {
  return (
    <Sheet
      position="center"
      ariaLabel={`Drinks on ${day.rel}, ${day.dateLabel}`}
      onClose={onClose}
      footer={
        day.count > 0 ? (
          <div className={styles.foot}>
            {day.over
              ? `${day.count - day.limit} over the limit of ${day.limit}.`
              : `Within the limit of ${day.limit}.`}
            {' · '}
            {day.grams} g of alcohol
          </div>
        ) : null
      }
    >
      <>
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
                <div className={styles.statLabel}>Standard</div>
                <div className={styles.statValue}>{day.std}</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Peak ‰ (est.)</div>
                <div className={styles.statValue}>{day.peak}</div>
              </div>
            </div>

            <div className={styles.log}>
              {day.entries.map((e) => (
                <DrinkRow key={e.id} entry={e} showGrams />
              ))}
            </div>
          </>
        ) : (
          <div className={styles.sober}>
            <div className={styles.soberMark}>✓</div>
            <div className={styles.soberText}>
              Alcohol-free day. Nothing logged.
            </div>
          </div>
        )}
      </>
    </Sheet>
  )
}
