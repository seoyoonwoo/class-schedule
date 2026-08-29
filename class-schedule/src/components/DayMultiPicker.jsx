import { useState } from 'react'
import { buildMonthGrid, formatMonth, parseDate, today, toKey } from '../utils/dateUtils'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 달력에서 날짜를 여러 개 고른다.
 * 시험처럼 며칠 하다 쉬었다 하는 일정을 그대로 찍을 수 있다.
 */
export default function DayMultiPicker({ picked, onToggle, color }) {
  const now = today()
  const first = picked.length > 0 ? parseDate([...picked].sort()[0]) : now

  const [cursor, setCursor] = useState({
    year: first.getFullYear(),
    month: first.getMonth(),
  })

  const cells = buildMonthGrid(cursor.year, cursor.month)
  const set = new Set(picked)

  function shift(delta) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div className="pickcal">
      <div className="pickcal-head">
        <span className="month">{formatMonth(cursor.year, cursor.month)}</span>
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

      <div className="pickcal-grid">
        {cells.map((c) => {
          const on = set.has(c.key)
          return (
            <button
              key={c.key}
              className={[
                'pickcal-cell',
                c.inMonth ? '' : 'out',
                c.weekday === 0 ? 'sun' : '',
                c.isToday ? 'today' : '',
                on ? 'on' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={on ? { background: color } : undefined}
              onClick={() => onToggle(c.key)}
              aria-pressed={on}
              aria-label={`${c.day}일`}
            >
              {c.day}
            </button>
          )
        })}
      </div>

      <button
        className="btn ghost tiny pickcal-today"
        onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
      >
        이번 달로
      </button>
    </div>
  )
}
