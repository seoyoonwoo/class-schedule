// 일정 종류 = 형광펜 색. 새 종류를 추가하고 싶으면 여기만 고치면 된다.
export const EVENT_TYPES = {
  수행평가: { hl: '#FF9DBE', ink: '#8C1F44' },
  시험: { hl: '#FFE86B', ink: '#7A5B00' },
  행사: { hl: '#8BE8CB', ink: '#0C5C46' },
  준비물: { hl: '#A5C8FF', ink: '#1A3E8C' },
  기타: { hl: '#D8D8DE', ink: '#3A3A44' },
}

export const TYPE_NAMES = Object.keys(EVENT_TYPES)

export function typeStyle(type) {
  return EVENT_TYPES[type] || EVENT_TYPES['기타']
}
