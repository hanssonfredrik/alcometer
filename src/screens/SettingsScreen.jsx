import { useState } from 'react'
import { DRINK_TYPES, LABELS, THEMES } from '../lib/constants.js'
import {
  exportBackup,
  exportEntriesCsv,
  importBackupFile,
} from '../lib/backup.js'
import { hapticLog } from '../lib/haptics.js'
import styles from './SettingsScreen.module.css'

export default function SettingsScreen({ data, actions }) {
  const { profile, sizes } = data
  const [dataMsg, setDataMsg] = useState(null) // { kind: 'ok' | 'err', text }

  const theme = profile.theme ?? 'pink'

  const handleImport = async () => {
    setDataMsg(null)
    try {
      const obj = await importBackupFile()
      if (!obj) return // picker cancelled
      const count = actions.importData(obj)
      hapticLog()
      setDataMsg({ kind: 'ok', text: `Imported ${count} entries.` })
    } catch (err) {
      setDataMsg({ kind: 'err', text: err.message || 'Import failed.' })
    }
  }

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

      <div className={styles.sectionLabel}>APPEARANCE</div>
      <p className={styles.hint}>Pick the neon accent used across the app.</p>
      <div className={styles.themeRow}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={styles.themeBtn}
            data-selected={theme === t.id}
            aria-label={t.label}
            aria-pressed={theme === t.id}
            onClick={() => actions.setTheme(t.id)}
          >
            <span
              className={styles.themeSwatch}
              style={{ background: t.swatch }}
            />
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.sectionLabel}>WEEKLY GOAL</div>
      <p className={styles.hint}>
        Standard drinks per week — your Insights trend is measured against this.
      </p>
      <label className={styles.weightField}>
        Target (std / week)
        <input
          type="number"
          inputMode="decimal"
          value={profile.weeklyTarget ?? ''}
          onChange={(e) =>
            actions.setProfile({
              weeklyTarget: Math.max(0, parseFloat(e.target.value) || 0),
            })
          }
        />
      </label>

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

      <div className={styles.sectionLabel}>DATA</div>
      <p className={styles.hint}>
        Everything stays on this device. Keep a backup so a lost or wiped phone
        doesn&apos;t cost you your history.
      </p>
      <div className={styles.dataBtns}>
        <button className={styles.dataBtn} onClick={() => exportBackup(data)}>
          Download backup
        </button>
        <button className={styles.dataBtn} onClick={handleImport}>
          Import backup
        </button>
        <button
          className={styles.dataBtn}
          onClick={() => exportEntriesCsv(data)}
        >
          Export entries (CSV)
        </button>
      </div>
      {dataMsg && (
        <p className={styles.dataMsg} data-kind={dataMsg.kind}>
          {dataMsg.text}
        </p>
      )}

      <div className={styles.disclaimer}>
        Promille is estimated with the <span className={styles.em}>Widmark</span>{' '}
        formula using your weight, sex (body-water ratio) and time since your
        first drink, with alcohol burned off at ~0.15&nbsp;‰/h. It&apos;s an
        estimate — never a substitute for a real breathalyzer.
      </div>

      <a
        className={styles.privacyLink}
        href="https://victorious-moss-0f60f0d10.7.azurestaticapps.net/privacy"
        target="_blank"
        rel="noopener"
      >
        All data stays on this device — privacy policy
      </a>
    </div>
  )
}
