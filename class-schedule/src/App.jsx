import { useEffect, useState } from 'react'
import DdayHero from './components/DdayHero'
import EventList from './components/EventList'
import CalendarView from './components/CalendarView'
import EventSheet from './components/EventSheet'
import EditPanel from './components/EditPanel'
import PhotoViewer from './components/PhotoViewer'
import { useEvents } from './utils/useEvents'
import { useAdmin } from './utils/useAdmin'
import { formatKorean, toKey, today, upcoming } from './utils/dateUtils'
import { GROUPS, groupOf } from './utils/eventTypes'

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
  const [viewer, setViewer] = useState(null) // { images, index }

  function openPhoto(images, index) {
    setViewer({ images, index })
  }

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

  // 홈 화면: 제일 가까운 하나를 크게, 나머지를 종류별 칸으로
  const next = upcoming(store.visible)
  const hero = next[0]
  const below = next.slice(1)
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
          <DdayHero event={hero} onPhoto={openPhoto} />

          {GROUPS.map(({ id, label }) => {
            const items = below.filter((e) => groupOf(e.type) === id)
            if (items.length === 0) return null
            return (
              <section className="section" key={id}>
                <p className="section-label">{label}</p>
                <EventList events={items} onSelect={setSelectedDate} />
              </section>
            )
          })}

          {below.length === 0 && hero && (
            <p className="empty-note">다른 일정은 없어요</p>
          )}
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
          onPhoto={openPhoto}
        />
      )}

      {viewer && (
        <PhotoViewer
          images={viewer.images}
          index={viewer.index}
          onClose={() => setViewer(null)}
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
