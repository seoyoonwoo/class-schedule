import { useEffect, useState } from 'react'
import { addDays, dayOf, toKey, today, weekdayOf } from '../utils/dateUtils'
import { fetchRange, mondayOf, weekDays } from '../utils/timetable'

const WEEKDAYS = ['월', '화', '수', '목', '금']

/**
 * 칸이 좁아서 긴 과목명은 줄여 쓴다.
 * 원래 이름은 칸을 눌렀을 때(title)에서 볼 수 있다.
 */
const SHORTEN = [
  ['과학탐구실험', '과탐실험'],
  ['자율·자치활동', '자율자치'],
  ['자율자치활동', '자율자치'],
  ['동아리활동', '동아리'],
  ['진로활동', '진로'],
  ['봉사활동', '봉사'],
  ['창의적체험활동', '창체'],
]

function shortSubject(name) {
  for (const [long, short] of SHORTEN) {
    if (name.startsWith(long)) return name.replace(long, short)
  }
  return name
}

/**
 * 주간 시간표.
 * 학교가 나이스에 올린 걸 그대로 받아오므로 직접 입력할 게 없다.
 * 이번 주와 다음 주를 오갈 수 있다.
 */
export default function TimetableView() {
  const todayKey = toKey(today())
  const thisMonday = mondayOf(todayKey)
  const nextMonday = addDays(thisMonday, 7)

  const [monday, setMonday] = useState(thisMonday)
  const [table, setTable] = useState(null)
  const [error, setError] = useState('')

  const days = weekDays(monday)
  const thisWeek = monday === thisMonday

  useEffect(() => {
    let alive = true
    setTable(null)
    setError('')

    fetchRange(days[0], days[4])
      .then((data) => {
        if (alive) setTable(data)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monday])

  // 그 주에 있는 교시 중 가장 큰 것까지만 줄을 만든다
  const maxPeriod = table
    ? Math.max(
        0,
        ...days.flatMap((d) => (table[d] || []).map((r) => r.period))
      )
    : 0

  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1)

  return (
    <>
      <div className="card">
        <div className="cal-head">
          <span className="month">
            {thisWeek ? '이번 주' : '다음 주'}
            <span className="week-range">
              {dayOf(days[0])}일 ~ {dayOf(days[4])}일
            </span>
          </span>
          <div className="cal-nav">
            {/* 지난 주나 먼 미래는 볼 일이 없어서 두 주만 오간다 */}
            <button
              onClick={() => setMonday(thisMonday)}
              disabled={thisWeek}
              aria-label="이번 주"
            >
              ‹
            </button>
            <button
              onClick={() => setMonday(nextMonday)}
              disabled={!thisWeek}
              aria-label="다음 주"
            >
              ›
            </button>
          </div>
        </div>

        {table === null && !error && <p className="empty-note">불러오는 중...</p>}
        {error && <p className="empty-note">{error}</p>}

        {table && periods.length === 0 && (
          <p className="empty-note">이 주에는 수업이 없어요</p>
        )}

        {table && periods.length > 0 && (
          <div className="tt">
            <div className="tt-row tt-head">
              <span className="tt-period" />
              {days.map((d, i) => (
                <span
                  key={d}
                  className={`tt-day${d === todayKey ? ' now' : ''}`}
                >
                  {WEEKDAYS[i]}
                  <em>{dayOf(d)}</em>
                </span>
              ))}
            </div>

            {periods.map((p) => (
              <div className="tt-row" key={p}>
                <span className="tt-period">{p}</span>
                {days.map((d) => {
                  const found = (table[d] || []).find((r) => r.period === p)
                  return (
                    <span
                      key={d}
                      className={`tt-cell${d === todayKey ? ' now' : ''}${
                        found ? '' : ' blank'
                      }`}
                      title={found ? found.subject : ''}
                    >
                      {found ? shortSubject(found.subject) : ''}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
        학교에서 올린 시간표를 그대로 보여줘요. 바뀌면 자동으로 반영돼요.
      </p>
    </>
  )
}
