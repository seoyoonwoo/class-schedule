// 날짜 계산은 전부 여기 모아둠. 시간대 문제 안 생기게
// "2026-09-15" 같은 문자열을 항상 "그 지역 자정"으로 다룬다.

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']

/** "2026-09-15" -> Date (로컬 자정) */
export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Date -> "2026-09-15" */
export function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 오늘 자정 */
export function today() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * 남은 날짜. 오늘이면 0, 내일이면 1, 어제면 -1.
 * 시간이 아니라 "날짜 칸" 기준으로 세기 때문에 오후 11시에 봐도 정확하다.
 */
export function dday(dateStr) {
  const MS_PER_DAY = 86400000
  const diff = parseDate(dateStr).getTime() - today().getTime()
  return Math.round(diff / MS_PER_DAY)
}

/** D-3, D-DAY, D+2 */
export function ddayLabel(n) {
  if (n === 0) return 'D-DAY'
  if (n > 0) return `D-${n}`
  return `D+${Math.abs(n)}`
}

/** "9월 15일 (화)" */
export function formatKorean(dateStr) {
  const d = parseDate(dateStr)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KO[d.getDay()]})`
}

/** "2026년 9월" */
export function formatMonth(year, month) {
  return `${year}년 ${month + 1}월`
}

/**
 * 달력 그리드용 42칸(6주) 배열.
 * 앞뒤로 이전달/다음달 날짜를 채워서 항상 높이가 같게 만든다.
 */
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())

  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push({
      key: toKey(d),
      day: d.getDate(),
      weekday: d.getDay(),
      inMonth: d.getMonth() === month,
      isToday: toKey(d) === toKey(today()),
    })
  }
  return cells
}

/** 날짜 오름차순 정렬 */
export function sortByDate(events) {
  return [...events].sort((a, b) => a.date.localeCompare(b.date))
}

/** 오늘 포함 이후 일정만 */
export function upcoming(events) {
  return sortByDate(events).filter((e) => dday(e.date) >= 0)
}

/** { "2026-09-15": [event, ...] } 형태로 묶기 */
export function groupByDate(events) {
  const map = {}
  for (const e of events) {
    if (!map[e.date]) map[e.date] = []
    map[e.date].push(e)
  }
  return map
}
