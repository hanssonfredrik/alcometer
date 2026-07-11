import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

// No-ops on the web build; only the native shells give tactile feedback.
const isNative = Capacitor.isNativePlatform()

/** Light tap — logging a drink. */
export function hapticLog() {
  if (isNative) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

/** Firmer tap — undoing/removing an entry. */
export function hapticUndo() {
  if (isNative) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
}
