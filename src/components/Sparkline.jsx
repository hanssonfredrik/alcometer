import styles from './Sparkline.module.css'

/**
 * Small weekly-trend line for the Insights trend card. Purely presentational:
 * `spark` is lib/charts.js sparkPath() output in a SPARK_W × SPARK_H box,
 * `targetY` the y of the weekly target (or null), `over` whether the last
 * point is above target. Decorative — the card's text states the numbers.
 */
export default function Sparkline({ spark, w, h, targetY, over, labels }) {
  const last = spark.points.at(-1)
  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={styles.plot}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          focusable="false"
        >
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {targetY != null && (
            <line
              className={styles.target}
              x1="0"
              x2={w}
              y1={targetY}
              y2={targetY}
            />
          )}
          <path d={spark.area} fill="url(#sparkFill)" />
          <path className={styles.line} d={spark.line} />
        </svg>
        {last && (
          <span
            className={styles.dot}
            data-over={over}
            style={{
              left: `${(last.x / w) * 100}%`,
              top: `${(last.y / h) * 100}%`,
            }}
          />
        )}
      </div>
      {labels && (
        <div className={styles.labels}>
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  )
}
