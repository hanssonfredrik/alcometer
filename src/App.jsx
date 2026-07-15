import { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { useTracker } from './hooks/useTracker.js'
import { dateKey } from './lib/datetime.js'
import { hapticLog, hapticUndo } from './lib/haptics.js'
import { WEEKDAYS, MONTHS } from './lib/constants.js'
import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
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
  const { data, now, actions } = useTracker()
  const [screen, setScreen] = useState('today')
  // Id of the most recently logged drink, for the inline "Undo" affordance.
  const [undoId, setUndoId] = useState(null)

  // Android hardware/gesture back: fall back to the Today tab first; from
  // there, background the app (never exit — that would feel like a crash).
  const screenRef = useRef(screen)
  screenRef.current = screen
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const listener = CapacitorApp.addListener('backButton', () => {
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
    document.documentElement.dataset.theme = data?.profile?.theme || 'pink'
  }, [data?.profile?.theme])

  const d = new Date(now)
  const dateLabel = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`

  const todayEntries = data?.days?.[dateKey(now)]?.entries ?? []
  const undoEntry = undoId ? todayEntries.find((e) => e.id === undoId) : null

  const logDrink = useCallback(
    (type) => {
      hapticLog()
      setUndoId(actions.addDrink(type))
    },
    [actions],
  )
  const logCustom = useCallback(
    (custom) => {
      hapticLog()
      setUndoId(actions.addCustomDrink(custom))
    },
    [actions],
  )
  const removeDrink = useCallback(
    (id, key) => {
      actions.removeDrink(id, key)
      setUndoId((cur) => (cur === id ? null : cur))
    },
    [actions],
  )
  const undoLast = useCallback(() => {
    if (undoId) {
      hapticUndo()
      removeDrink(undoId)
    }
  }, [undoId, removeDrink])

  return (
    <div className={styles.app}>
      <div className={styles.frame}>
        <Header
          screenLabel={SCREEN_LABELS[screen]}
          dateLabel={dateLabel}
          data={data}
          now={now}
        />

        <main className={`${styles.scroll} scrollArea`}>
          {screen === 'today' && (
            <TodayScreen
              data={data}
              now={now}
              actions={actions}
              undoEntry={undoEntry}
              onLogDrink={logDrink}
              onLogCustom={logCustom}
              onRemoveDrink={removeDrink}
              onUndo={undoLast}
            />
          )}
          {screen === 'history' && <HistoryScreen data={data} now={now} />}
          {screen === 'insights' && <InsightsScreen data={data} now={now} />}
          {screen === 'settings' && (
            <SettingsScreen data={data} actions={actions} />
          )}
        </main>

        <BottomNav screen={screen} onNavigate={setScreen} />
      </div>
    </div>
  )
}
