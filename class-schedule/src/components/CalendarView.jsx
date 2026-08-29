import { useState } from 'react'
import {
  addDays,
  buildMonthGrid,
  eventDates,
  formatMonth,
  isRange,
  today,
} from '../utils/dateUtils'
import { typeStyle } from '../utils/eventTypes'

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

    if (!isRange(e)) {
      slot(e.date).dots.push({ id: e.id, color })
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

  const dayMap = buildDayMap(events)
  const cells = buildMonthGrid(cursor.year, cursor.month)

  function shift(delta) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div className="card">
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

          const classes = [
            'cal-cell',
            c.inMonth ? '' : 'out',
            c.weekday === 0 ? 'sun' : '',
            c.isToday ? 'today' : '',
            count > 0 ? 'has-event' : '',
            selectedDate === c.key ? 'selected' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={c.key}
              className={classes}
              disabled={count === 0}
              onClick={() => onSelect(c.key)}
              aria-label={`${c.day}일${count ? `, 일정 ${count}개` : ''}`}
            >
              <span className="num">{c.day}</span>

              {day.dots.length > 0 && (
                <span className="dots">
                  {day.dots.slice(0, 3).map((d) => (
                    <span key={d.id} className="dot" style={{ background: d.color }} />
                  ))}
                </span>
              )}

              {day.bands.length > 0 && (
                <span className="bands">
                  {day.bands.slice(0, 2).map((b) => (
                    <span
                      key={b.id}
                      className={`band${b.first ? ' first' : ''}${b.last ? ' last' : ''}`}
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
