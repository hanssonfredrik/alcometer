import { describeDrink } from '../lib/drinks.js'
import styles from './UndoToast.module.css'

/**
 * Floating "Logged … · Undo" snackbar shown after a drink is added. App.jsx
 * owns the entry and the auto-dismiss timer; this only renders it.
 */
export default function UndoToast({ entry, onUndo }) {
  if (!entry) return null
  const cl = +(entry.ml / 10).toFixed(1)
  return (
    <div className={styles.toast} role="status">
      <span className={styles.text}>
        Logged {describeDrink({ type: entry.type, cl })}
      </span>
      <button type="button" className={styles.btn} onClick={onUndo}>
        Undo
      </button>
    </div>
  )
}
