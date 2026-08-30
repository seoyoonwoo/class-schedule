// 날짜 계산은 전부 여기 모아둠. 시간대 문제 안 생기게

/**
 * 하루 일정이 끝난 걸로 치는 시각 (24시간 기준). 17이면 오후 5시.
 * 학교가 더 늦게 끝나면 이 숫자만 바꾸면 된다.
 */
export const DAY_ENDS_AT = 17
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

/** 오늘 포함 이후 일정. 이미 시작했지만 아직 안 끝난 것도 포함한다. */
export function upcoming(events) {
  return sortByDate(events).filter((e) => dday(endDateOf(e)) >= 0)
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

// ---------- 여러 날에 걸친 일정 ----------

/** 끝나는 날. 하루짜리면 시작일과 같다. */
export function endDateOf(event) {
  if (event.endDate && event.endDate > event.date) return event.endDate
  return event.date
}

/** 하루짜리가 아니라 기간 일정인지 */
export function isRange(event) {
  return endDateOf(event) !== event.date
}

/** 시작일부터 끝일까지 날짜 키를 모두 만든다 */
export function datesBetween(start, end) {
  const out = []
  const last = parseDate(end)
  const d = parseDate(start)
  // 실수로 아주 먼 날짜가 들어와도 멈추도록 상한을 둔다
  for (let i = 0; i < 400 && d <= last; i++) {
    out.push(toKey(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

/** 날짜 키를 n일 옮긴다. "2026-10-12" +1 -> "2026-10-13" */
export function addDays(key, n) {
  const d = parseDate(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

/**
 * 일정이 실제로 진행되는 날짜만 추린다.
 * skipWeekends가 켜져 있으면 토·일을 뺀다.
 * excludeDates에 적힌 날짜(공휴일 등)도 뺀다. 이건 events.json을 직접 고칠 때 쓴다.
 */
export function eventDates(event) {
  const all = datesBetween(event.date, endDateOf(event))
  const excluded = new Set(event.excludeDates || [])

  const kept = all.filter((key) => {
    if (excluded.has(key)) return false
    if (event.skipWeekends) {
      const w = parseDate(key).getDay()
      if (w === 0 || w === 6) return false
    }
    return true
  })

  // 전부 걸러졌으면 설정이 잘못된 것이니 원래 날짜를 그대로 쓴다
  return kept.length > 0 ? kept : all
}

/** "10월 12일 (월) ~ 10월 16일 (금)" */
export function formatSpan(event) {
  if (!isRange(event)) return formatKorean(event.date)
  return `${formatKorean(event.date)} ~ ${formatKorean(endDateOf(event))}`
}

/** 오늘이 기간 안에 들어와 있는지 */
export function isRunning(event) {
  return dday(event.date) <= 0 && dday(endDateOf(event)) >= 0
}

/** 기간 중 오늘이 몇 일차인지. 쉬는 날은 세지 않는다. 진행 중이 아니면 0 */
export function dayNumber(event) {
  if (!isRunning(event)) return 0
  const i = eventDates(event).indexOf(toKey(today()))
  return i < 0 ? 0 : i + 1
}

/** 토요일이나 일요일인지 */
export function isWeekend(key) {
  const w = parseDate(key).getDay()
  return w === 0 || w === 6
}

/** 요일 한 글자. "2026-10-14" -> "수" */
export function weekdayOf(key) {
  return ['일', '월', '화', '수', '목', '금', '토'][parseDate(key).getDay()]
}

/** 날짜 키에서 일(day)만. "2026-10-14" -> 14 */
export function dayOf(key) {
  return parseDate(key).getDate()
}

/**
 * 히어로와 뱃지에 쓸 문구.
 *
 *   하루짜리     D-3 -> D-DAY -> (사라짐)
 *   여러 날짜리   D-3 -> 진행 중 -> ... -> 마지막 날 -> (사라짐)
 *
 * 기간 일정은 시작한 날부터 '진행 중'이다. 주말처럼 쉬는 날도 기간 안이면
 * 그대로 '진행 중'으로 둔다. 마지막 날만 따로 알려줘야 놓치지 않는다.
 */
export function statusLabel(event) {
  const n = dday(event.date)

  // 아직 시작 전
  if (n > 0) return `D-${n}`

  if (!isRange(event)) {
    return n === 0 ? 'D-DAY' : `D+${Math.abs(n)}`
  }

  if (dday(endDateOf(event)) === 0) return '마지막 날'
  if (isRunning(event)) return '진행 중'
  return `D+${Math.abs(n)}`
}

/** 큰 글씨로 쓰기엔 긴 문구인지 (히어로에서 글자 크기를 줄일 때 쓴다) */
export function isWideLabel(label) {
  return label === '진행 중' || label === '마지막 날'
}

// ---------- 하루가 끝났는지 ----------

/**
 * 오늘 일과가 끝난 시각을 지났는지 (기본 오후 5시).
 * 학교가 끝난 뒤에는 오늘 있던 일정을 홈 화면에서 내린다.
 */
export function afterSchool() {
  return new Date().getHours() >= DAY_ENDS_AT
}

/**
 * 홈 화면에서 이 일정을 이제 내려도 되는지.
 *
 *   하루짜리    당일 오후 5시가 지나면 내린다
 *   기간짜리    마지막 날 오후 5시가 지나면 내린다
 *
 * 달력에서는 그대로 보이므로 "지난 일정 보기"에는 영향이 없다.
 */
export function isFinished(event) {
  const left = dday(endDateOf(event))
  if (left < 0) return true
  if (left === 0) return afterSchool()
  return false
}

/** 홈 화면 히어로에 올릴 순서. 숫자가 작을수록 위에 온다. */
export function heroRank(event) {
  // 며칠 이어지는 시험이 진행 중이면 최우선. 시험 기간에는 그게 제일 중요하다.
  // 하루짜리 시험은 여기 해당하지 않는다. 같은 날 있는 수행평가와 나란히
  // 보여야 하기 때문이다.
  if (event.type === '시험' && isRange(event) && isRunning(event)) return 0

  // 오늘 있는 것
  if (dday(event.date) === 0) return 1

  // 나머지는 가까운 순서대로
  return 2
}
