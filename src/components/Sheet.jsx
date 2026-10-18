import { useEffect, useRef } from 'react'
import { pushBackHandler } from '../lib/backStack.js'
import styles from './Sheet.module.css'

/**
 * Shared modal shell. `position="bottom"` (default) slides a full-width sheet
 * up from the bottom edge; `position="center"` is the classic centred dialog.
 * Closes on overlay tap, Escape, and — via lib/backStack — the Android back
 * button. `children` scroll; `footer` stays pinned below them.
 *
 * Pass a stable `onClose` (useCallback) so the listeners aren't re-registered
 * every render.
 */
export default function Sheet({
  ariaLabel,
  onClose,
  children,
  footer,
  position = 'bottom',
}) {
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const offBack = pushBackHandler(onClose)
    return () => {
      window.removeEventListener('keydown', onKey)
      offBack()
    }
  }, [onClose])

  // Move focus into the dialog so keyboard/screen-reader users land inside.
  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <div className={styles.overlay} data-position={position} onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {position === 'bottom' && (
          <div className={styles.grabber} aria-hidden="true" />
        )}
        <div className={`${styles.body} scrollArea`}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}
