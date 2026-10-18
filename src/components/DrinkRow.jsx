import styles from './DrinkRow.module.css'

/**
 * One logged drink. `entry` is a display object: { typeLabel, icon, cl, abv,
 * timeLabel, grams? }. With `onEdit` the body becomes a tappable button; with
 * `onRemove` a 44px "×" is appended. Shared by Today and DayDetailModal.
 */
export default function DrinkRow({ entry, onEdit, onRemove, showGrams }) {
  const content = (
    <>
      <span className={styles.icon} aria-hidden="true">
        {entry.icon}
      </span>
      <span className={styles.main}>
        <span className={styles.type}>{entry.typeLabel}</span>
        <span className={styles.meta}>
          {entry.cl} cl · {entry.abv}%
          {showGrams && entry.grams != null ? ` · ${entry.grams} g` : ''}
        </span>
      </span>
      <span className={styles.time}>{entry.timeLabel}</span>
    </>
  )
  return (
    <div className={styles.row}>
      {onEdit ? (
        <button
          type="button"
          className={styles.body}
          onClick={onEdit}
          aria-label={`Edit ${entry.typeLabel}`}
        >
          {content}
        </button>
      ) : (
        <div className={styles.body}>{content}</div>
      )}
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          aria-label={`Remove ${entry.typeLabel}`}
        >
          ×
        </button>
      )}
    </div>
  )
}
