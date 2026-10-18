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
  // preventScroll: the sheet is already in view, and a focus-driven scroll of
  // the (overflow: hidden) frame would shift the whole app.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  // iOS scrolls the document (and any overflow: hidden ancestor) to lift a
  // focused input above the keyboard, and in an installed PWA it often does
  // not scroll back when the keyboard closes — the app then sits shifted up
  // with a blank band below the nav. Undo that whenever a field loses focus
  // and when the sheet goes away. Only ancestors of the overlay are touched,
  // so the main scroll area (a sibling) keeps its position.
  const resetAncestorScroll = () => {
    let el = ref.current?.parentElement
    while (el) {
      if (el.scrollTop) el.scrollTop = 0
      if (el.scrollLeft) el.scrollLeft = 0
      el = el.parentElement
    }
    if (window.scrollY || window.scrollX) window.scrollTo(0, 0)
  }
  useEffect(() => resetAncestorScroll, [])
  const onBlur = (e) => {
    if (e.target.matches?.('input, select, textarea')) {
      // After the keyboard has had a frame to dismiss.
      setTimeout(resetAncestorScroll, 60)
    }
  }

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
        onBlur={onBlur}
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
