import { useState } from 'react'
import { DRINK_TYPES, LABELS } from '../lib/constants.js'
import Sheet from './Sheet.jsx'
import styles from './EditDrinkModal.module.css'

/**
 * Modal for editing a logged drink. `entry` seeds the form with UI units
 * ({ type, cl, abv (percent), time ('HH:MM') }); `onSave` receives the same
 * shape back — conversion to storage units happens in useTracker.
 */
export default function EditDrinkModal({ entry, onSave, onClose }) {
  const [form, setForm] = useState({
    type: entry.type,
    cl: entry.cl,
    abv: entry.abv,
    time: entry.time,
  })

  const cl = parseFloat(form.cl)
  const abv = parseFloat(form.abv)
  const valid = cl > 0 && abv >= 0 && abv <= 100 && !!form.time

  return (
    <Sheet position="center" ariaLabel="Edit drink" onClose={onClose}>
      <>
        <div className={styles.title}>EDIT DRINK</div>
        <div className={styles.typeRow}>
          {DRINK_TYPES.map((type) => (
            <button
              key={type}
              className={styles.typePill}
              data-selected={form.type === type}
              onClick={() => setForm((f) => ({ ...f, type }))}
            >
              {LABELS[type]}
            </button>
          ))}
        </div>
        <div className={styles.fields}>
          <label className={styles.field}>
            Size (cl)
            <input
              type="number"
              inputMode="decimal"
              value={form.cl}
              onChange={(e) => setForm((f) => ({ ...f, cl: e.target.value }))}
            />
          </label>
          <label className={styles.field}>
            Strength (%)
            <input
              type="number"
              inputMode="decimal"
              value={form.abv}
              onChange={(e) => setForm((f) => ({ ...f, abv: e.target.value }))}
            />
          </label>
          <label className={styles.field}>
            Time
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
          </label>
        </div>
        <div className={styles.buttons}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            disabled={!valid}
            onClick={() => onSave(form)}
          >
            Save
          </button>
        </div>
      </>
    </Sheet>
  )
}
