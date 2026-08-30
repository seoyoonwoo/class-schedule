import { SCHOOL } from '../config'
import { addDays, toKey } from './dateUtils'

// 교육부 나이스(NEIS) 교육정보 개방 포털에서 시간표를 받아온다.
// 학교가 올린 시간표를 그대로 쓰기 때문에 직접 입력할 게 없고,
// 학교에서 시간표를 바꾸면 다음 날 앱에도 반영된다.

const BASE = 'https://open.neis.go.kr/hub/hisTimetable'

export function isTimetableReady() {
  return Boolean(SCHOOL?.key && SCHOOL?.code)
}

/** "2026-09-01" -> "20260901" (나이스가 요구하는 형식) */
function toNeisDate(key) {
  return key.replace(/-/g, '')
}

/**
 * 기간 시간표를 한 번에 받아온다.
 * 하루씩 요청하면 5번을 부르게 되니 시작일~끝일로 한 번만 부른다.
 *
 * @returns { "2026-09-01": [{ period, subject }, ...], ... }
 */
export async function fetchRange(fromKey, toKeyStr) {
  if (!isTimetableReady()) return {}

  const params = new URLSearchParams({
    KEY: SCHOOL.key,
    Type: 'json',
    pSize: '200',
    ATPT_OFCDC_SC_CODE: SCHOOL.office,
    SD_SCHUL_CODE: SCHOOL.code,
    GRADE: String(SCHOOL.grade),
    CLASS_NM: String(SCHOOL.classNo),
    TI_FROM_YMD: toNeisDate(fromKey),
    TI_TO_YMD: toNeisDate(toKeyStr),
  })

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error('시간표를 불러오지 못했어요.')

  const json = await res.json()

  // 수업이 없는 기간(방학 등)은 오류처럼 생긴 응답이 온다. 오류가 아니라 빈 것이다.
  const rows = json?.hisTimetable?.[1]?.row
  if (!Array.isArray(rows)) return {}

  const byDate = {}
  for (const r of rows) {
    const ymd = r.ALL_TI_YMD
    const subject = (r.ITRT_CNTNT || '').trim()
    const period = Number(r.PERIO)
    if (!ymd || !subject || Number.isNaN(period)) continue

    const key = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
    if (!byDate[key]) byDate[key] = []
    byDate[key].push({ period, subject })
  }

  for (const key of Object.keys(byDate)) {
    byDate[key].sort((a, b) => a.period - b.period)
  }

  return byDate
}

/** 그 날짜가 속한 주의 월요일 */
export function mondayOf(dateKey) {
  const day = new Date(dateKey + 'T00:00:00').getDay()
  // 일요일(0)이면 지난 월요일이 아니라 다음 날부터가 그 주다
  const back = day === 0 ? 6 : day - 1
  return addDays(dateKey, -back)
}

/** 월요일부터 금요일까지 5일 */
export function weekDays(mondayKey) {
  return [0, 1, 2, 3, 4].map((i) => addDays(mondayKey, i))
}
