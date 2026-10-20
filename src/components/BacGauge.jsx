import { useMemo } from 'react'
import {
  arcPath,
  gaugeBands,
  gaugeScale,
  gaugeTicks,
  polar,
} from '../lib/charts.js'
import styles from './BacGauge.module.css'

// SVG geometry (viewBox units). The arc is a top semicircle; tick labels sit
// just outside it and `children` (the big ‰ readout) sits in the bowl.
const W = 240
const H = 124
const CX = 120
const CY = 114
const R = 92

const BANDS = gaugeBands().map((b) => ({
  ...b,
  from0: b.from,
  to0: b.to,
  // A hairline gap between bands so they read as separate zones.
  d: arcPath(
    CX,
    CY,
    R,
    b.from + (b.from ? 0.006 : 0),
    b.to - (b.to < 1 ? 0.006 : 0),
  ),
}))
const TICKS = gaugeTicks().map((t) => ({ ...t, ...polar(CX, CY, R + 15, t.t) }))

/**
 * Speedometer-style dial for the estimated BAC. Four dim zone-coloured bands
 * (equal share each, see gaugeScale), the same bands lit up to the current
 * value, and a pointer riding the arc. Decorative — the
 * readable value is `children`, so the SVG is aria-hidden.
 *
 * The knob reads the parent's `--zone` (BacHero sets it per zone).
 */
export default function BacGauge({ bac, children }) {
  const t = gaugeScale(bac)
  // "Filled so far": each band up to the needle, in its own zone colour, so
  // the arc reads light → tipsy → drunk as the evening goes on.
  const fills = useMemo(
    () =>
      t > 0.002
        ? BANDS.filter((b) => b.from < t).map((b) => ({
            id: b.id,
            d: arcPath(CX, CY, R, b.from0, Math.min(b.to0, t)),
            last: t <= b.to0,
          }))
        : [],
    [t],
  )

  return (
    <div className={styles.gauge}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
        focusable="false"
      >
        <path className={styles.track} d={arcPath(CX, CY, R, 0, 1)} />
        {BANDS.map((b) => (
          <path
            key={b.id}
            className={styles.band}
            d={b.d}
            style={{ stroke: `var(--zone-${b.id})` }}
          />
        ))}
        {fills.map((f) => (
          <path
            key={f.id}
            className={styles.fill}
            data-last={f.last}
            d={f.d}
            style={{ stroke: `var(--zone-${f.id})` }}
          />
        ))}
        {TICKS.map((tk) => (
          <text
            key={tk.value}
            className={styles.tick}
            x={tk.x}
            y={tk.y + 4}
            textAnchor={tk.t < 0.1 ? 'start' : tk.t > 0.9 ? 'end' : 'middle'}
            dx={tk.t < 0.1 ? -6 : tk.t > 0.9 ? 6 : 0}
          >
            {tk.label}
          </text>
        ))}
        {/* Pointer drawn at t = 0 (pointing left) and rotated into place, so
            the move animates as a sweep along the dial. */}
        <g
          className={styles.pointer}
          style={{ transform: `rotate(${(t * 180).toFixed(2)}deg)` }}
        >
          <line
            className={styles.needle}
            x1={CX - R + 16}
            y1={CY}
            x2={CX - R - 7}
            y2={CY}
          />
          <circle className={styles.knob} cx={CX - R} cy={CY} r={6.5} />
        </g>
      </svg>
      <div className={styles.readout}>{children}</div>
    </div>
  )
}
