import { useMemo } from 'react'
import { computeStreaks } from '../lib/alcohol.js'
import styles from './Header.module.css'

export default function Header({ screenLabel, dateLabel, data, now }) {
  const streak = useMemo(
    () => (data ? computeStreaks(data.days, now) : { current: 0 }),
    [data, now],
  )

  return (
    <header className={styles.header}>
      <div>
        <div className={styles.label}>{screenLabel}</div>
        <div className={styles.date}>{dateLabel}</div>
      </div>
      <div className={styles.streak}>
        <span className={styles.dot} />
        <span className={styles.streakNum}>{streak.current}</span>
        <span className={styles.streakText}>day streak</span>
      </div>
    </header>
  )
}
