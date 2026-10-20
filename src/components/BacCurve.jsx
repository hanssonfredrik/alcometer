import { CURVE_W, CURVE_H } from '../lib/charts.js'
import styles from './BacCurve.module.css'

/**
 * Tonight's estimated BAC over time (Today, under the summary line).
 * Purely presentational: `curve` comes from TodayScreen's memo via
 * lib/charts.js curveGeometry() in a CURVE_W × CURVE_H plot, plus the
 * pre-formatted time labels.
 *
 * The SVG stretches to the card (preserveAspectRatio="none", non-scaling
 * strokes); anything that must stay round or readable — the now dot, guide
 * labels, drink ticks, axis — is HTML positioned in percent on top.
 */
const pct = (v, of) => `${((v / of) * 100).toFixed(2)}%`

export default function BacCurve({ curve, isToday }) {
  const { geo, axis, soberLabel } = curve
  return (
    <section
      className={styles.card}
      aria-label="Estimated blood alcohol over time"
    >
      <div className={styles.head}>
        <span className={styles.title}>
          {isToday ? 'Tonight’s curve' : 'That evening'}
        </span>
        <span className={styles.est}>ESTIMATE</span>
      </div>

      <div className={styles.plot}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${CURVE_W} ${CURVE_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="bacCurveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.45" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {geo.guides.map((g) => (
            <line
              key={g.id}
              className={styles.guide}
              x1="0"
              x2={CURVE_W}
              y1={g.y}
              y2={g.y}
              style={{ stroke: `var(--zone-${g.id})` }}
            />
          ))}
          <path
            className={styles.area}
            d={geo.area}
            fill="url(#bacCurveFill)"
          />
          {geo.futureArea && (
            <path className={styles.futureArea} d={geo.futureArea} />
          )}
          <path className={styles.line} d={geo.past} />
          {geo.future && <path className={styles.projection} d={geo.future} />}
        </svg>

        {geo.guides.map((g) => (
          <span
            key={g.id}
            className={styles.guideLabel}
            style={{ top: pct(g.y, CURVE_H), color: `var(--zone-${g.id})` }}
          >
            {g.value}
          </span>
        ))}

        {geo.drinks.map((d) => (
          <span
            key={d.id}
            className={styles.drinkTick}
            style={{ left: pct(d.x, CURVE_W) }}
          />
        ))}

        {geo.now && (
          <span
            className={styles.nowDot}
            style={{
              left: pct(geo.now.x, CURVE_W),
              top: pct(geo.now.y, CURVE_H),
            }}
          />
        )}
      </div>

      <div className={styles.axis} aria-hidden="true">
        {axis.map((a) => (
          <span key={a}>{a}</span>
        ))}
      </div>

      {isToday && soberLabel && (
        <div className={styles.legend}>
          <span className={styles.legendDash} aria-hidden="true" />
          If you stop now: zero around {soberLabel}
        </div>
      )}
    </section>
  )
}
