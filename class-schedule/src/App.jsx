import { useEffect, useState } from 'react'
import DdayHero from './components/DdayHero'
import EventList from './components/EventList'
import CalendarView from './components/CalendarView'
import EventSheet from './components/EventSheet'
import EditPanel from './components/EditPanel'
import { useEvents } from './utils/useEvents'
import { useAdmin } from './utils/useAdmin'
import { formatKorean, toKey, today, upcoming } from './utils/dateUtils'

const BASE_TABS = [
  { id: 'home', label: '홈', glyph: '✦' },
  { id: 'calendar', label: '달력', glyph: '▦' },
]

const EDIT_TAB = { id: 'edit', label: '편집', glyph: '✎' }

export default function App() {
  const { isAdmin, lock } = useAdmin()
  const store = useEvents(isAdmin)
  const [tab, setTab] = useState('home')
  const [selectedDate, setSelectedDate] = useState(null)
  const [toast, setToast] = useState('')

  const tabs = isAdmin ? [...BASE_TABS, EDIT_TAB] : BASE_TABS

  // 편집 탭을 보던 중에 잠기면 홈으로 되돌린다
  useEffect(() => {
    if (!isAdmin && tab === 'edit') setTab('home')
  }, [isAdmin, tab])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const next = upcoming(store.visible)
  const sheetEvents = selectedDate
    ? store.visible.filter((e) => e.date === selectedDate)
    : []

  return (
    <div className="app">
      <header className="topbar">
        <h1>{store.className} 일정</h1>
        <span className="date">{formatKorean(toKey(today()))}</span>
      </header>

      {store.loading && <p className="empty-note">불러오는 중...</p>}
      {store.error && <p className="empty-note">{store.error}</p>}

      {!store.loading && !store.error && tab === 'home' && (
        <>
          <DdayHero event={next[0]} />
          <section className="section">
            <p className="section-label">다가오는 일정</p>
            <EventList
              events={next.slice(1)}
              onSelect={setSelectedDate}
              emptyText="당분간은 조용하네요"
            />
          </section>
        </>
      )}

      {!store.loading && !store.error && tab === 'calendar' && (
        <>
          <CalendarView
            events={store.visible}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
          <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
            점이 찍힌 날짜를 누르면 자세히 볼 수 있어요
          </p>
        </>
      )}

      {!store.loading && !store.error && tab === 'edit' && isAdmin && (
        <EditPanel store={store} onToast={setToast} onLock={lock} />
      )}

      {sheetEvents.length > 0 && (
        <EventSheet
          date={selectedDate}
          events={sheetEvents}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      <nav
        className="tabbar"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'on' : ''}
            onClick={() => {
              setTab(t.id)
              setSelectedDate(null)
            }}
          >
            <span className="glyph">{t.glyph}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
