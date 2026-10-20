import { useCallback, useState } from 'react'
import {
  DRINK_TYPES,
  LABELS,
  THEMES,
  DEFAULT_THEME,
  DEFAULT_PROFILE,
  DEFAULT_WEEKLY_TARGET,
  DEFAULT_SIZES,
} from '../lib/constants.js'
import {
  countEntries,
  exportBackup,
  exportEntriesCsv,
  importBackupFile,
} from '../lib/backup.js'
import { hapticLog } from '../lib/haptics.js'
import NumberField from '../components/NumberField.jsx'
import ImportBackupModal from '../components/ImportBackupModal.jsx'
import styles from './SettingsScreen.module.css'

export default function SettingsScreen({ data, actions }) {
  const { profile, sizes } = data
  const [dataMsg, setDataMsg] = useState(null) // { kind: 'ok' | 'err', text }
  const [confirmImport, setConfirmImport] = useState(false)

  const theme = profile.theme ?? DEFAULT_THEME

  const closeImport = useCallback(() => setConfirmImport(false), [])

  // Runs from the modal's confirm button click so the file picker still
  // counts as user-initiated on iOS/Android. Import is a full replace — the
  // modal has just told the user so.
  const handleImport = async () => {
    setConfirmImport(false)
    setDataMsg(null)
    try {
      const obj = await importBackupFile()
      if (!obj) return // picker cancelled
      const count = actions.importData(obj)
      hapticLog()
      setDataMsg({
        kind: 'ok',
        text: `Backup restored. ${count} ${count === 1 ? 'drink is' : 'drinks are'} now on this device.`,
      })
    } catch (err) {
      setDataMsg({
        kind: 'err',
        text: err.message || 'Couldn’t restore that backup.',
      })
    }
  }

  return (
    <div>
      <div className={styles.sectionLabel}>YOUR BODY</div>

      <label className={styles.weightField}>
        Weight (kg)
        <NumberField
          value={profile.weight}
          fallback={DEFAULT_PROFILE.weight}
          min={1}
          onCommit={(weight) => actions.setProfile({ weight })}
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
      <p className={styles.hint}>Pick the accent color for the app.</p>
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

      <div className={styles.sectionLabel}>WEEKLY TARGET</div>
      <p className={styles.hint}>
        The most standard drinks you want in a week. Insights compares your
        trend with it. A standard drink is 12 g of alcohol.
      </p>
      <label className={styles.weightField}>
        Standard drinks a week
        <NumberField
          value={profile.weeklyTarget ?? DEFAULT_WEEKLY_TARGET}
          fallback={DEFAULT_WEEKLY_TARGET}
          onCommit={(weeklyTarget) => actions.setProfile({ weeklyTarget })}
        />
      </label>

      <div className={styles.sectionLabel}>YOUR USUAL SIZES</div>
      <p className={styles.hint}>
        These are picked for you when you log a drink. Change them to match your
        usual pour.
      </p>

      {DRINK_TYPES.map((type) => {
        const s = sizes[type]
        return (
          <div key={type} className={styles.sizeRow}>
            <div className={styles.sizeName}>{LABELS[type]}</div>
            <label className={styles.sizeField}>
              cl
              <NumberField
                value={+(s.ml / 10).toFixed(1)}
                fallback={DEFAULT_SIZES[type].ml / 10}
                min={0.1}
                onCommit={(cl) => actions.setSize(type, { ml: cl * 10 })}
              />
            </label>
            <label className={styles.sizeField}>
              %
              <NumberField
                value={+(s.abv * 100).toFixed(1)}
                fallback={DEFAULT_SIZES[type].abv * 100}
                max={100}
                onCommit={(pct) => actions.setSize(type, { abv: pct / 100 })}
              />
            </label>
          </div>
        )
      })}

      <button className={styles.reset} onClick={() => actions.resetSizes()}>
        Reset to Swedish defaults
      </button>

      <div className={styles.sectionLabel}>DATA</div>
      <p className={styles.hint}>
        Everything stays on this device. Keep a backup so a lost or wiped phone
        doesn&apos;t cost you your history.
      </p>
      <div className={styles.dataBtns}>
        <button className={styles.dataBtn} onClick={() => exportBackup(data)}>
          Back up now
        </button>
        <button
          className={styles.dataBtn}
          onClick={() => {
            setDataMsg(null)
            setConfirmImport(true)
          }}
        >
          Import backup
        </button>
        <button
          className={styles.dataBtn}
          onClick={() => exportEntriesCsv(data)}
        >
          Export drinks (CSV)
        </button>
      </div>
      {dataMsg && (
        <p className={styles.dataMsg} data-kind={dataMsg.kind}>
          {dataMsg.text}
        </p>
      )}

      <div className={styles.disclaimer}>
        The ‰ level is an estimate. It uses the{' '}
        <span className={styles.em}>Widmark</span> formula with your weight, sex
        and the time since your first drink, and assumes about 0.15&nbsp;‰ burns
        off per hour. Real levels vary with food, health and medication. Never
        use it to decide whether you can drive.
      </div>

      <a
        className={styles.privacyLink}
        href="https://victorious-moss-0f60f0d10.7.azurestaticapps.net/privacy"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy policy
      </a>

      {confirmImport && (
        <ImportBackupModal
          entries={countEntries(data)}
          days={Object.keys(data.days).length}
          onConfirm={handleImport}
          onClose={closeImport}
        />
      )}
    </div>
  )
}
