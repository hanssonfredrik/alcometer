import Sheet from './Sheet.jsx'
import styles from './ImportBackupModal.module.css'

/**
 * Centred confirmation shown before the backup file picker opens. Importing
 * is a full restore — everything on the device is removed and replaced by
 * the file — so the user must understand and accept that first.
 *
 * `onConfirm` must open the file picker synchronously: it runs inside the
 * button's click handler so iOS/Android still treat the picker as
 * user-initiated.
 */
export default function ImportBackupModal({
  entries,
  days,
  onConfirm,
  onClose,
}) {
  const hasData = entries > 0
  const buttons = (
    <div className={styles.buttons}>
      <button className={styles.cancelBtn} onClick={onClose}>
        Cancel
      </button>
      <button className={styles.confirmBtn} onClick={onConfirm}>
        Choose file and replace
      </button>
    </div>
  )
  return (
    <Sheet
      position="center"
      ariaLabel="Import backup"
      onClose={onClose}
      footer={buttons}
    >
      <>
        <div className={styles.title}>IMPORT BACKUP</div>
        <p className={styles.lead}>
          The backup file <strong>replaces everything</strong> on this device.
        </p>
        <ul className={styles.list}>
          <li>
            {hasData ? (
              <>
                This removes the <strong>{entries}</strong>{' '}
                {entries === 1 ? 'drink' : 'drinks'} you logged on{' '}
                <strong>{days}</strong> {days === 1 ? 'day' : 'days'}.
              </>
            ) : (
              <>This removes any drinks you logged.</>
            )}
          </li>
          <li>
            Your weight, sex, weekly target, usual sizes and color come from the
            file.
          </li>
          <li>Nothing is merged. Only what is in the file is kept.</li>
        </ul>
        <p className={styles.warn}>
          You can&apos;t undo this. Back up first if you want to keep
          what&apos;s here.
        </p>
      </>
    </Sheet>
  )
}
