import { SCHOOL } from '../config'

// 나이스 교육정보 개방 포털에서 급식 식단을 받아온다.
// 시간표와 같은 인증키를 쓴다.

const BASE = 'https://open.neis.go.kr/hub/mealServiceDietInfo'

/** 알레르기 유발 식품 번호 (교육부 표기 기준) */
export const ALLERGENS = {
  1: '난류',
  2: '우유',
  3: '메밀',
  4: '땅콩',
  5: '대두',
  6: '밀',
  7: '고등어',
  8: '게',
  9: '새우',
  10: '돼지고기',
  11: '복숭아',
  12: '토마토',
  13: '아황산류',
  14: '호두',
  15: '닭고기',
  16: '쇠고기',
  17: '오징어',
  18: '조개류',
  19: '잣',
}

export function isMealReady() {
  return Boolean(SCHOOL?.key && SCHOOL?.code)
}

function toNeisDate(key) {
  return key.replace(/-/g, '')
}

/**
 * 메뉴 한 줄을 이름과 알레르기 번호로 나눈다.
 * "어묵메추리알볶이 (1.5.6.13.18)" -> { name: '어묵메추리알볶이', codes: [1,5,6,13,18] }
 * "검정찰보리밥(자율)" 처럼 숫자가 아닌 괄호는 이름에 그대로 남긴다.
 */
function parseDish(raw) {
  const text = raw.replace(/<[^>]*>/g, '').trim()
  const match = text.match(/\s*\(([\d.\s]+)\)\s*$/)

  if (!match) return { name: text, codes: [] }

  return {
    name: text.slice(0, match.index).trim(),
    codes: match[1]
      .split('.')
      .map((n) => Number(n.trim()))
      .filter((n) => n > 0),
  }
}

/**
 * 기간 급식을 한 번에 받아온다.
 * @returns { "2026-09-01": { dishes: [{name, codes}], kcal: '802.3' }, ... }
 */
export async function fetchMeals(fromKey, toKeyStr) {
  if (!isMealReady()) return {}

  const params = new URLSearchParams({
    KEY: SCHOOL.key,
    Type: 'json',
    pSize: '50',
    ATPT_OFCDC_SC_CODE: SCHOOL.office,
    SD_SCHUL_CODE: SCHOOL.code,
    MLSV_FROM_YMD: toNeisDate(fromKey),
    MLSV_TO_YMD: toNeisDate(toKeyStr),
  })

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error('급식을 불러오지 못했어요.')

  const json = await res.json()

  // 급식이 없는 기간은 오류처럼 생긴 응답이 온다. 오류가 아니라 빈 것이다.
  const rows = json?.mealServiceDietInfo?.[1]?.row
  if (!Array.isArray(rows)) return {}

  const byDate = {}
  for (const r of rows) {
    // 중식만 쓴다 (코드 2). 조식이나 석식이 있는 학교도 있다.
    if (r.MMEAL_SC_CODE && r.MMEAL_SC_CODE !== '2') continue

    const ymd = r.MLSV_YMD
    if (!ymd || !r.DDISH_NM) continue

    const key = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
    byDate[key] = {
      dishes: r.DDISH_NM.split(/<br\s*\/?>/i)
        .map(parseDish)
        .filter((d) => d.name),
      kcal: (r.CAL_INFO || '').replace('Kcal', '').trim(),
    }
  }

  return byDate
}
