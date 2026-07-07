import { useCallback, useState } from 'react'
import { useTracker } from './hooks/useTracker.js'
import { dateKey } from './lib/datetime.js'
import { WEEKDAYS, MONTHS } from './lib/constants.js'
import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
import TodayScreen from './screens/TodayScreen.jsx'
import HistoryScreen from './screens/HistoryScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'
import styles from './App.module.css'

const SCREEN_LABELS = { today: 'TONIGHT', history: 'HISTORY', settings: 'SETUP' }

export default function App() {
  const { data, now, actions } = useTracker()
  const [screen, setScreen] = useState('today')
  // Id of the most recently logged drink, for the inline "Undo" affordance.
  const [undoId, setUndoId] = useState(null)

  const d = new Date(now)
  const dateLabel = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`

  const todayEntries = data?.days?.[dateKey(now)]?.entries ?? []
  const undoEntry = undoId ? todayEntries.find((e) => e.id === undoId) : null

  const logDrink = useCallback((type) => setUndoId(actions.addDrink(type)), [actions])
  const logCustom = useCallback(
    (custom) => setUndoId(actions.addCustomDrink(custom)),
    [actions],
  )
  const removeDrink = useCallback(
    (id) => {
      actions.removeDrink(id)
      setUndoId((cur) => (cur === id ? null : cur))
    },
    [actions],
  )
  const undoLast = useCallback(() => {
    if (undoId) removeDrink(undoId)
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
          {screen === 'settings' && (
            <SettingsScreen data={data} actions={actions} />
          )}
        </main>

        <BottomNav screen={screen} onNavigate={setScreen} />
      </div>
    </div>
  )
}
