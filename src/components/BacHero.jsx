import styles from './BacHero.module.css'

/**
 * The Today hero: the estimated blood-alcohol level, its plain-language zone,
 * when it burns off, and the drink count against tonight's limit. Purely
 * presentational — every prop is pre-formatted by TodayScreen's memo.
 *
 * `zone` is a BAC_ZONES record; its id selects the `--zone` colour via the
 * `[data-zone]` rules in the CSS module.
 */
export default function BacHero({
  bac,
  zone,
  isToday,
  soberLabel,
  count,
  limit,
  over,
}) {
  const overBy = count - limit
  return (
    <section
      className={styles.hero}
      data-zone={zone.id}
      data-over={over}
      aria-live="polite"
    >
      <div className={styles.eyebrow}>
        {isToday ? 'BLOOD ALCOHOL · ESTIMATE' : 'PEAK THAT EVENING · ESTIMATE'}
      </div>
      <div className={styles.numRow}>
        <span className={styles.num}>{bac}</span>
        <span className={styles.unit}>‰</span>
      </div>
      <div className={styles.zoneRow}>
        <span className={styles.zone}>
          <span className={styles.zoneDot} aria-hidden="true" />
          {zone.label}
        </span>
        {isToday && soberLabel && (
          <span className={styles.sober}>Sober by ~{soberLabel}</span>
        )}
      </div>
      <div className={styles.count}>
        {count} / {limit} {count === 1 ? 'drink' : 'drinks'}
        {over && <span className={styles.overBy}> · {overBy} over limit</span>}
      </div>
    </section>
  )
}
