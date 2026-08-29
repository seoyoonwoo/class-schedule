// 일정 종류 = 형광펜 색 + 홈 화면의 어느 칸에 들어갈지.
// 새 종류를 추가하고 싶으면 여기만 고치면 앱 전체에 반영된다.
//
// group
//   exam     시험 — 맨 위 칸
//   perf     수행평가 — 가운데 칸
//   activity 행사, 제출, 준비물, 기타 — 아래 칸
export const EVENT_TYPES = {
  시험: { hl: '#FFE86B', ink: '#7A5B00', group: 'exam' },
  수행평가: { hl: '#FF9DBE', ink: '#8C1F44', group: 'perf' },
  제출: { hl: '#C6B8FF', ink: '#3B2A80', group: 'activity' },
  준비물: { hl: '#A5C8FF', ink: '#1A3E8C', group: 'activity' },
  행사: { hl: '#8BE8CB', ink: '#0C5C46', group: 'activity' },
  기타: { hl: '#D8D8DE', ink: '#3A3A44', group: 'activity' },
}

export const TYPE_NAMES = Object.keys(EVENT_TYPES)

export function typeStyle(type) {
  return EVENT_TYPES[type] || EVENT_TYPES['기타']
}

export function groupOf(type) {
  return typeStyle(type).group
}

/** 홈 화면 칸 순서와 이름 */
export const GROUPS = [
  { id: 'exam', label: '시험' },
  { id: 'perf', label: '수행평가' },
  { id: 'activity', label: '활동 · 제출' },
]
