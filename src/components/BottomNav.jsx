import styles from './BottomNav.module.css'

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Setup' },
]

export default function BottomNav({ screen, onNavigate }) {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => {
        const active = screen === tab.id
        return (
          <button
            key={tab.id}
            className={styles.tab}
            onClick={() => onNavigate(tab.id)}
            aria-current={active ? 'page' : undefined}
          >
            {active && <span className={styles.indicator} />}
            <span className={active ? styles.labelActive : styles.label}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
