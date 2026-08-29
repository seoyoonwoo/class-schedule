import { useState } from 'react'
import { buildMonthGrid, formatMonth, groupByDate, today } from '../utils/dateUtils'
import { typeStyle } from '../utils/eventTypes'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function CalendarView({ events, selectedDate, onSelect }) {
  const now = today()
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  })

  const byDate = groupByDate(events)
  const cells = buildMonthGrid(cursor.year, cursor.month)

  function shift(delta) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function goToday() {
    setCursor({ year: now.getFullYear(), month: now.getMonth() })
  }

  return (
    <div className="card">
      <div className="cal-head">
        <button className="month" onClick={goToday} aria-label="이번 달로 이동">
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
          const dayEvents = byDate[c.key] || []
          const classes = [
            'cal-cell',
            c.inMonth ? '' : 'out',
            c.weekday === 0 ? 'sun' : '',
            c.isToday ? 'today' : '',
            dayEvents.length > 0 ? 'has-event' : '',
            selectedDate === c.key ? 'selected' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={c.key}
              className={classes}
              disabled={dayEvents.length === 0}
              onClick={() => onSelect(c.key)}
              aria-label={`${c.day}일${
                dayEvents.length ? `, 일정 ${dayEvents.length}개` : ''
              }`}
            >
              <span className="num">{c.day}</span>
              {dayEvents.length > 0 && (
                <span className="dots">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className="dot"
                      style={{ background: typeStyle(e.type).hl }}
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
