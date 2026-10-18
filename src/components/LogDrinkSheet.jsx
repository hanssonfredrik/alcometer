import { useMemo, useState } from 'react'
import {
  DRINK_TYPES,
  LABELS,
  DRINK_ICONS,
  BACKFILL_HOUR,
} from '../lib/constants.js'
import { sizeChips, describeDrink } from '../lib/drinks.js'
import Sheet from './Sheet.jsx'
import styles from './LogDrinkSheet.module.css'

/** The pre-selected chip for a type: the configured default, else the first. */
function defaultCl(type, sizes) {
  const chips = sizeChips(type, sizes)
  return (chips.find((c) => c.isDefault) || chips[0])?.cl ?? 0
}

/** ABV in percent for the UI (0.045 → 4.5), from the stored fraction. */
function defaultAbv(type, sizes) {
  return +((sizes?.[type]?.abv ?? 0) * 100).toFixed(1)
}

/**
 * Bottom sheet for logging one drink: pick a type, pick a size (the user's
 * configured pour is pre-selected; "Custom" opens cl + % inputs), confirm.
 * `onAdd` receives UI units ({ type, cl, abv in percent }); conversion to
 * storage units happens in useTracker.addCustomDrink.
 */
export default function LogDrinkSheet({
  sizes,
  initialType,
  isToday,
  dayLabel,
  onAdd,
  onClose,
}) {
  const [type, setType] = useState(initialType)
  const [cl, setCl] = useState(() => defaultCl(initialType, sizes))
  // null while a chip is selected; { cl, abv } (strings/numbers, UI units)
  // once the user opens the custom inputs.
  const [custom, setCustom] = useState(null)

  const chips = useMemo(() => sizeChips(type, sizes), [type, sizes])
  const abv = defaultAbv(type, sizes)

  const pickType = (t) => {
    setType(t)
    setCl(defaultCl(t, sizes))
    setCustom(null)
  }
  const pickChip = (value) => {
    setCl(value)
    setCustom(null)
  }
  const openCustom = () => setCustom({ cl, abv })

  const finalCl = custom ? parseFloat(custom.cl) : cl
  const finalAbv = custom ? parseFloat(custom.abv) : abv
  const valid = finalCl > 0 && finalAbv >= 0 && finalAbv <= 100
  const submit = () => {
    if (valid) onAdd({ type, cl: finalCl, abv: finalAbv })
  }

  return (
    <Sheet
      ariaLabel="Log a drink"
      onClose={onClose}
      footer={
        <button
          type="button"
          className={styles.addBtn}
          disabled={!valid}
          onClick={submit}
        >
          Add {valid ? describeDrink({ type, cl: finalCl }) : LABELS[type]}
        </button>
      }
    >
      <div className={styles.title}>LOG A DRINK</div>
      {!isToday && (
        <p className={styles.note}>
          Adds to {dayLabel} at {BACKFILL_HOUR}:00 — tap the entry afterwards to
          adjust the time.
        </p>
      )}

      <div className={styles.tiles} role="group" aria-label="Drink type">
        {DRINK_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={styles.tile}
            data-selected={type === t}
            aria-pressed={type === t}
            onClick={() => pickType(t)}
          >
            <span className={styles.tileIcon} aria-hidden="true">
              {DRINK_ICONS[t]}
            </span>
            <span className={styles.tileText}>
              <span className={styles.tileName}>{LABELS[t]}</span>
              <span className={styles.tileMeta}>
                {defaultCl(t, sizes)} cl · {defaultAbv(t, sizes)}%
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className={styles.sectionLabel}>SIZE</div>
      <div className={styles.chips} role="group" aria-label="Size">
        {chips.map((c) => (
          <button
            key={c.cl}
            type="button"
            className={styles.chip}
            data-selected={!custom && cl === c.cl}
            aria-pressed={!custom && cl === c.cl}
            onClick={() => pickChip(c.cl)}
          >
            {c.cl} cl
            {c.isDefault && <span className={styles.chipTag}>usual</span>}
          </button>
        ))}
        <button
          type="button"
          className={styles.chip}
          data-selected={!!custom}
          aria-pressed={!!custom}
          onClick={openCustom}
        >
          Custom
        </button>
      </div>

      {custom && (
        <div className={styles.fields}>
          <label className={styles.field}>
            Size (cl)
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              value={custom.cl}
              onChange={(e) => setCustom((c) => ({ ...c, cl: e.target.value }))}
            />
          </label>
          <label className={styles.field}>
            Strength (%)
            <input
              type="number"
              inputMode="decimal"
              value={custom.abv}
              onChange={(e) =>
                setCustom((c) => ({ ...c, abv: e.target.value }))
              }
            />
          </label>
        </div>
      )}
    </Sheet>
  )
}
