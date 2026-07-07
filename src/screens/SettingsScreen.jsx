import { DRINK_TYPES, LABELS } from '../lib/constants.js'
import styles from './SettingsScreen.module.css'

export default function SettingsScreen({ data, actions }) {
  const { profile, sizes } = data

  return (
    <div>
      <div className={styles.sectionLabel}>YOUR BODY</div>

      <label className={styles.weightField}>
        Weight (kg)
        <input
          type="number"
          inputMode="decimal"
          value={profile.weight}
          onChange={(e) =>
            actions.setProfile({ weight: parseFloat(e.target.value) || 0 })
          }
        />
      </label>

      <div className={styles.subLabel}>Sex</div>
      <div className={styles.sexRow}>
        <button
          className={styles.sexBtn}
          data-selected={profile.sex === 'M'}
          onClick={() => actions.setProfile({ sex: 'M' })}
        >
          Male
        </button>
        <button
          className={styles.sexBtn}
          data-selected={profile.sex === 'F'}
          onClick={() => actions.setProfile({ sex: 'F' })}
        >
          Female
        </button>
      </div>

      <div className={styles.sectionLabel}>STANDARD DRINK SIZES</div>
      <p className={styles.hint}>
        These set what each quick-log button adds. Edit to match your usual pour.
      </p>

      {DRINK_TYPES.map((type) => {
        const s = sizes[type]
        return (
          <div key={type} className={styles.sizeRow}>
            <div className={styles.sizeName}>{LABELS[type]}</div>
            <label className={styles.sizeField}>
              cl
              <input
                type="number"
                inputMode="decimal"
                value={Math.round(s.ml / 10)}
                onChange={(e) =>
                  actions.setSize(type, {
                    ml: (parseFloat(e.target.value) || 0) * 10,
                  })
                }
              />
            </label>
            <label className={styles.sizeField}>
              %
              <input
                type="number"
                inputMode="decimal"
                value={Math.round(s.abv * 100)}
                onChange={(e) =>
                  actions.setSize(type, {
                    abv: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
              />
            </label>
          </div>
        )
      })}

      <button className={styles.reset} onClick={() => actions.resetSizes()}>
        Reset to Swedish standards
      </button>

      <div className={styles.disclaimer}>
        Promille is estimated with the <span className={styles.em}>Widmark</span>{' '}
        formula using your weight, sex (body-water ratio) and time since your
        first drink, with alcohol burned off at ~0.15&nbsp;‰/h. It&apos;s an
        estimate — never a substitute for a real breathalyzer.
      </div>
    </div>
  )
}
