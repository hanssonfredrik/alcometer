// A tiny stack of "what the back button should close first". Sheets and
// modals push their close handler on mount; the Android back-button listener
// in App.jsx runs the top one before falling back to tab navigation. Pure
// and platform-free so components stay platform-agnostic.
const stack = []

/** Register `fn` as the current back target. Returns an unsubscribe. */
export function pushBackHandler(fn) {
  stack.push(fn)
  return () => {
    const i = stack.lastIndexOf(fn)
    if (i >= 0) stack.splice(i, 1)
  }
}

/** Run the top handler, if any. Returns true when one consumed the event. */
export function handleBack() {
  const top = stack[stack.length - 1]
  if (!top) return false
  top()
  return true
}
