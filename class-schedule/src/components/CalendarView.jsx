import { useEffect, useState } from 'react'
import {
  addDays,
  buildMonthGrid,
  dday,
  endDateOf,
  eventDates,
  formatMonth,
  isRange,
  today,
} from '../utils/dateUtils'
import { typeStyle } from '../utils/eventTypes'
import { fetchSchoolSchedule, isScheduleReady } from '../utils/schoolSchedule'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 날짜별로 무엇을 그릴지 미리 계산한다.
 * 하루짜리는 점, 여러 날짜리는 가로로 이어지는 띠로 그린다.
 */
function buildDayMap(events) {
  const map = {}

  function slot(key) {
    if (!map[key]) map[key] = { dots: [], bands: [] }
    return map[key]
  }

  for (const e of events) {
    const color = typeStyle(e.type).hl
    // 이미 끝난 일정은 흐리게. 지워버리면 지난달에 뭐가 있었는지 알 수 없다.
    const past = dday(endDateOf(e)) < 0

    if (!isRange(e)) {
      slot(e.date).dots.push({ id: e.id, color, past })
      continue
    }

    // 실제 진행하는 날만. 주말을 빼면 중간이 끊기는데,
    // 앞뒤 날짜가 있는지로 모서리를 정하면 알아서 두 토막으로 그려진다.
    const days = eventDates(e)
    const set = new Set(days)

    for (const key of days) {
      slot(key).bands.push({
        id: e.id,
        color,
        past,
        first: !set.has(addDays(key, -1)),
        last: !set.has(addDays(key, 1)),
      })
    }
  }

  return map
}

export default function CalendarView({ events, selectedDate, onSelect }) {
  const now = today()
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  })

  // 확대해서 보기. 켜면 화면을 꽉 채우고 칸마다 일정 이름이 글자로 나온다.
  const [big, setBig] = useState(false)

  const dayMap = buildDayMap(events)
  const cells = buildMonthGrid(cursor.year, cursor.month)

  // 학교 전체 일정. 우리 반 일정과 섞이지 않게 달력에는 공휴일 색만 반영하고,
  // 나머지는 달력 아래 목록으로만 보여준다.
  const [school, setSchool] = useState([])

  useEffect(() => {
    if (!isScheduleReady()) return
    let alive = true

    const first = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const last = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${lastDay}`

    fetchSchoolSchedule(first, last)
      .then((list) => {
        if (alive) setSchool(list)
      })
      .catch(() => {
        if (alive) setSchool([])
      })

    return () => {
      alive = false
    }
  }, [cursor.year, cursor.month])

  const holidays = new Set(school.filter((s) => s.holiday).map((s) => s.date))

  // 확대했을 때 칸 안에 이름을 넣기 위해 날짜별로 묶는다
  const schoolByDate = {}
  for (const item of school) {
    if (!schoolByDate[item.date]) schoolByDate[item.date] = []
    schoolByDate[item.date].push(item)
  }

  const eventsByDate = {}
  for (const e of events) {
    for (const key of eventDates(e)) {
      if (!eventsByDate[key]) eventsByDate[key] = []
      eventsByDate[key].push(e)
    }
  }

  function shift(delta) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div className={`card${big ? ' cal-big' : ''}`}>
      <div className="cal-head">
        <button
          className="month"
          onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
          aria-label="이번 달로 이동"
        >
          {formatMonth(cursor.year, cursor.month)}
        </button>
        <div className="cal-nav">
          <button onClick={() => shift(-1)} aria-label="이전 달">
            ‹
          </button>
          <button onClick={() => shift(1)} aria-label="다음 달">
            ›
          </button>
          {big ? (
            <button onClick={() => setBig(false)} aria-label="작게 보기">
              ×
            </button>
          ) : (
            <button onClick={() => setBig(true)} aria-label="자세히 보기">
              ⤢
            </button>
          )}
        </div>
      </div>

      <div className="weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((c) => {
          const day = dayMap[c.key] || { dots: [], bands: [] }
          const count = day.dots.length + day.bands.length
          const allPast =
            count > 0 &&
            [...day.dots, ...day.bands].every((x) => x.past)

          const classes = [
            'cal-cell',
            c.inMonth ? '' : 'out',
            c.weekday === 0 || holidays.has(c.key) ? 'sun' : '',
            c.isToday ? 'today' : '',
            count > 0 ? 'has-event' : '',
            allPast ? 'past-only' : '',
            selectedDate === c.key ? 'selected' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={c.key}
              className={classes}
              disabled={count === 0 || big}
              onClick={() => onSelect(c.key)}
              aria-label={`${c.day}일${count ? `, 일정 ${count}개` : ''}`}
            >
              <span className="num">{c.day}</span>

              {big && (
                <span className="cell-names">
                  {(eventsByDate[c.key] || []).map((e) => (
                    <span
                      key={e.id}
                      className="cell-name"
                      style={{ background: typeStyle(e.type).hl }}
                    >
                      {e.title}
                    </span>
                  ))}
                  {(schoolByDate[c.key] || []).map((s) => (
                    <span
                      key={s.name}
                      className={`cell-name school${s.holiday ? ' holiday' : ''}`}
                    >
                      {s.name}
                    </span>
                  ))}
                </span>
              )}

              {!big && day.dots.length > 0 && (
                <span className="dots">
                  {day.dots.slice(0, 3).map((d) => (
                    <span
                      key={d.id}
                      className={`dot${d.past ? ' past' : ''}`}
                      style={{ background: d.color }}
                    />
                  ))}
                </span>
              )}

              {!big && day.bands.length > 0 && (
                <span className="bands">
                  {day.bands.slice(0, 2).map((b) => (
                    <span
                      key={b.id}
                      className={`band${b.first ? ' first' : ''}${b.last ? ' last' : ''}${b.past ? ' past' : ''}`}
                      style={{ background: b.color }}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

    </div>
  )
}
