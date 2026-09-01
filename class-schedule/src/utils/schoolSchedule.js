import { SCHOOL, SKIP_SCHOOL_EVENTS } from '../config'

// 나이스에서 학교 전체 일정(공휴일, 시험 기간, 학교 행사)을 받아온다.
// 우리 반 일정과는 성격이 달라서 달력 아래 목록으로만 보여준다.

const BASE = 'https://open.neis.go.kr/hub/SchoolSchedule'

// 무엇을 뺄지는 config.js에서 정한다.
// 설정이 없는 경우에도 앱이 깨지지 않게 기본값을 둔다.
const SKIP = SKIP_SCHOOL_EVENTS || ['토요휴업일', '일요휴업일']

export function isScheduleReady() {
  return Boolean(SCHOOL?.key && SCHOOL?.code)
}

function toNeisDate(key) {
  return key.replace(/-/g, '')
}

/** 우리 학년에 해당하는 일정인지 */
function forOurGrade(row) {
  const flag = {
    1: row.ONE_GRADE_EVENT_YN,
    2: row.TW_GRADE_EVENT_YN,
    3: row.THREE_GRADE_EVENT_YN,
  }[Number(SCHOOL.grade)]

  // 학년 표시가 아예 없는 일정은 전교 대상으로 본다
  return flag === undefined || flag === 'Y' || flag === '*'
}

/**
 * 한 달치 학사일정.
 * @returns [{ date, name, holiday }] 날짜순
 */
export async function fetchSchoolSchedule(fromKey, toKeyStr) {
  if (!isScheduleReady()) return []

  const params = new URLSearchParams({
    KEY: SCHOOL.key,
    Type: 'json',
    pSize: '100',
    ATPT_OFCDC_SC_CODE: SCHOOL.office,
    SD_SCHUL_CODE: SCHOOL.code,
    AA_FROM_YMD: toNeisDate(fromKey),
    AA_TO_YMD: toNeisDate(toKeyStr),
  })

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error('학사일정을 불러오지 못했어요.')

  const json = await res.json()

  // 일정이 없는 달은 오류처럼 생긴 응답이 온다. 오류가 아니라 빈 것이다.
  const rows = json?.SchoolSchedule?.[1]?.row
  if (!Array.isArray(rows)) return []

  const seen = new Set()
  const out = []

  for (const r of rows) {
    const name = (r.EVENT_NM || '').trim()
    if (!name || SKIP.some((word) => name.includes(word))) continue
    if (!forOurGrade(r)) continue

    const ymd = r.AA_YMD
    if (!ymd) continue

    const date = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`

    // 같은 날 같은 이름이 중복으로 오는 경우가 있다
    const id = `${date}|${name}`
    if (seen.has(id)) continue
    seen.add(id)

    out.push({
      date,
      name,
      holiday: r.SBTR_DD_SC_NM === '공휴일',
    })
  }

  return out.sort((a, b) => a.date.localeCompare(b.date))
}
