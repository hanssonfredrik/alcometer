import { describeDrink } from '../lib/drinks.js'
import styles from './UndoToast.module.css'

/**
 * Floating "Logged beer, 33 cl · Undo" snackbar shown after a drink is added.
 * App.jsx owns the entry and the auto-dismiss timer; this only renders it.
 * `raised` lifts it above Today's docked "Log a drink" button.
 */
export default function UndoToast({ entry, onUndo, raised = false }) {
  if (!entry) return null
  const cl = +(entry.ml / 10).toFixed(1)
  return (
    <div className={styles.toast} data-raised={raised} role="status">
      <span className={styles.text}>
        Logged {describeDrink({ type: entry.type, cl })}
      </span>
      <button type="button" className={styles.btn} onClick={onUndo}>
        Undo
      </button>
    </div>
  )
}
