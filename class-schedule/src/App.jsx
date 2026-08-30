import { useEffect, useState } from 'react'
import DdayHero from './components/DdayHero'
import EventList from './components/EventList'
import CalendarView from './components/CalendarView'
import EventSheet from './components/EventSheet'
import EditPanel from './components/EditPanel'
import PhotoViewer from './components/PhotoViewer'
import { useEvents } from './utils/useEvents'
import { useSeen } from './utils/useSeen'
import { useAdmin } from './utils/useAdmin'
import { dday, eventDates, formatKorean, toKey, today, upcoming } from './utils/dateUtils'
import { GROUPS, groupOf } from './utils/eventTypes'

const BASE_TABS = [
  { id: 'home', label: '홈', glyph: '✦' },
  { id: 'calendar', label: '달력', glyph: '▦' },
]

const EDIT_TAB = { id: 'edit', label: '편집', glyph: '✎' }

export default function App() {
  const { isAdmin, lock } = useAdmin()
  const store = useEvents(isAdmin)
  const isNew = useSeen(store.visible)
  const [tab, setTab] = useState('home')
  // 열려 있는 상세 창. { title, events } 형태.
  // 목록에서 누르면 그 일정 하나만, 달력에서 날짜를 누르면 그 날 전부 담는다.
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState('')
  const [viewer, setViewer] = useState(null) // { images, index }

  function openPhoto(images, index) {
    setViewer({ images, index })
  }

  /** 목록에서 일정 하나를 눌렀을 때 */
  function openEvent(event) {
    setSheet({ title: formatKorean(event.date), events: [event] })
  }

  /** 달력에서 날짜를 눌렀을 때 — 그 날 일정을 모두 */
  function openDate(key) {
    // 달력은 지난 일정도 보여주므로 전체에서 찾는다
    const onThatDay = store.events.filter((e) => eventDates(e).includes(key))
    if (onThatDay.length > 0) {
      setSheet({ title: formatKorean(key), events: onThatDay, dateKey: key })
    }
  }

  const tabs = isAdmin ? [...BASE_TABS, EDIT_TAB] : BASE_TABS

  // 편집 탭을 보던 중에 잠기면 홈으로 되돌린다
  useEffect(() => {
    if (!isAdmin && tab === 'edit') setTab('home')
  }, [isAdmin, tab])

  // 아직 안 올린 변경이 있으면 창을 닫을 때 한 번 물어본다
  useEffect(() => {
    if (!store.dirty) return
    function warn(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [store.dirty])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(t)
  }, [toast])

  // 홈 화면: 시험과 수행평가 중 제일 가까운 것을 크게 띄운다.
  // 제출이나 준비물은 날짜가 더 가깝더라도 자기 칸에만 나온다.
  const next = upcoming(store.visible)
  const heroPool = next.filter((e) => groupOf(e.type) !== 'activity')
  const soonest = heroPool.length > 0 ? dday(heroPool[0].date) : null

  // 같은 날에 여러 개면 하나만 보여주다 놓칠 수 있으니 전부 띄운다
  const heroes = heroPool.filter((e) => dday(e.date) === soonest)
  const heroIds = new Set(heroes.map((e) => e.id))
  const below = next.filter((e) => !heroIds.has(e.id))

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
          <DdayHero events={heroes} onPhoto={openPhoto} isNew={isNew} />

          {GROUPS.map(({ id, label }) => {
            const items = below.filter((e) => groupOf(e.type) === id)
            return (
              <section className="section" key={id}>
                <p className="section-label">{label}</p>
                {items.length > 0 ? (
                  <EventList events={items} onSelect={openEvent} isNew={isNew} />
                ) : (
                  <p className="section-empty">예정된 일정이 없어요</p>
                )}
              </section>
            )
          })}
        </>
      )}

      {!store.loading && !store.error && tab === 'calendar' && (
        <>
          <CalendarView
            events={store.events}
            selectedDate={sheet?.dateKey}
            onSelect={openDate}
          />
          <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
            점이 찍힌 날짜를 누르면 자세히 볼 수 있어요. 지난 일정은 흐리게
            보여요.
          </p>
        </>
      )}

      {!store.loading && !store.error && tab === 'edit' && isAdmin && (
        <EditPanel store={store} onToast={setToast} onLock={lock} />
      )}

      {sheet && (
        <EventSheet
          title={sheet.title}
          events={sheet.events}
          onClose={() => setSheet(null)}
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
              setSheet(null)
            }}
          >
            <span className="glyph">
              {t.glyph}
              {t.id === 'edit' && store.dirty && <i className="tab-dot" />}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
