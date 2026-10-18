import { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { useTracker } from './hooks/useTracker.js'
import { dateKey } from './lib/datetime.js'
import { hapticLog, hapticUndo } from './lib/haptics.js'
import { handleBack } from './lib/backStack.js'
import {
  WEEKDAYS,
  MONTHS,
  DEFAULT_THEME,
  UNDO_TOAST_MS,
} from './lib/constants.js'
import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
import UndoToast from './components/UndoToast.jsx'
import TodayScreen from './screens/TodayScreen.jsx'
import HistoryScreen from './screens/HistoryScreen.jsx'
import InsightsScreen from './screens/InsightsScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'
import styles from './App.module.css'

const SCREEN_LABELS = {
  today: 'TONIGHT',
  history: 'HISTORY',
  insights: 'INSIGHTS',
  settings: 'SETUP',
}

export default function App() {
  const { data, now, actions, saveError, dismissSaveError } = useTracker()
  const [screen, setScreen] = useState('today')
  // The most recently logged drink ({ id, key }) for the "Undo" toast — the
  // day key is captured at log time so a backfilled drink (or a log just
  // before the 05:00 rollover) resolves to the right bucket.
  const [undo, setUndo] = useState(null)

  // The toast dismisses itself; a fresh `undo` object per log restarts it.
  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), UNDO_TOAST_MS)
    return () => clearTimeout(t)
  }, [undo])

  // Android hardware/gesture back: close an open sheet/modal first (see
  // lib/backStack), then fall back to the Today tab; from there, background
  // the app (never exit — that would feel like a crash).
  const screenRef = useRef(screen)
  screenRef.current = screen
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const listener = CapacitorApp.addListener('backButton', () => {
      if (handleBack()) return
      if (screenRef.current !== 'today') setScreen('today')
      else CapacitorApp.minimizeApp()
    })
    return () => {
      listener.then((handle) => handle.remove())
    }
  }, [])

  // Reflect the chosen accent theme on the document root; the `[data-theme]`
  // blocks in global.css swap the `--accent*` tokens the whole UI reads from.
  useEffect(() => {
    document.documentElement.dataset.theme =
      data?.profile?.theme || DEFAULT_THEME
  }, [data?.profile?.theme])

  const d = new Date(now)
  const dateLabel = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`

  const undoEntry = undo
    ? (data?.days?.[undo.key]?.entries ?? []).find((e) => e.id === undo.id)
    : null

  // The log sheet always has an explicit size in hand (UI units: cl and
  // percent), so every log goes through addCustomDrink.
  const logDrink = useCallback(
    (drink, key) => {
      hapticLog()
      const id = actions.addCustomDrink(drink, key)
      setUndo({ id, key: key ?? dateKey(Date.now()) })
    },
    [actions],
  )
  const removeDrink = useCallback(
    (id, key) => {
      actions.removeDrink(id, key)
      setUndo((cur) => (cur?.id === id ? null : cur))
    },
    [actions],
  )
  const undoLast = useCallback(() => {
    if (undo) {
      hapticUndo()
      removeDrink(undo.id, undo.key)
    }
  }, [undo, removeDrink])

  return (
    <div className={styles.app}>
      <div className={styles.frame}>
        <Header
          screenLabel={SCREEN_LABELS[screen]}
          dateLabel={dateLabel}
          data={data}
          now={now}
        />

        {saveError && (
          <div className={styles.saveError} role="alert">
            <div className={styles.saveErrorText}>
              Couldn&apos;t save — your last change may not be stored.
            </div>
            <button
              type="button"
              className={styles.saveErrorDismiss}
              onClick={dismissSaveError}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <div className={styles.body}>
          <main className={`${styles.scroll} scrollArea`}>
            {screen === 'today' && (
              <TodayScreen
                data={data}
                now={now}
                actions={actions}
                onLogDrink={logDrink}
                onRemoveDrink={removeDrink}
              />
            )}
            {screen === 'history' && <HistoryScreen data={data} now={now} />}
            {screen === 'insights' && <InsightsScreen data={data} now={now} />}
            {screen === 'settings' && (
              <SettingsScreen data={data} actions={actions} />
            )}
          </main>
          <UndoToast entry={undoEntry} onUndo={undoLast} />
        </div>

        <BottomNav screen={screen} onNavigate={setScreen} />
      </div>
    </div>
  )
}
