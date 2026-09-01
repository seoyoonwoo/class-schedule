/**
 * 탭바 아이콘.
 *
 * 선으로만 그린다. 색을 쓰지 않고 currentColor를 따라가서,
 * 선택된 탭은 진한 검정, 나머지는 회색으로 자동으로 갈린다.
 */

const common = {
  viewBox: '0 0 24 24',
  width: 21,
  height: 21,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

/** 집 */
export function HomeIcon() {
  return (
    <svg {...common}>
      <path d="M3.5 11 L12 3.5 L20.5 11 v8.5 a1.5 1.5 0 0 1 -1.5 1.5 H5 a1.5 1.5 0 0 1 -1.5 -1.5 Z" />
      <path d="M9 21 v-6 h6 v6" />
    </svg>
  )
}

/** 달력 */
export function CalendarIcon() {
  return (
    <svg {...common}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10 H20.5" />
      <path d="M8 3 V6.5M16 3 V6.5" />
    </svg>
  )
}

/** 시계 — 달력과 헷갈리지 않도록 형태를 확실히 다르게 */
export function ClockIcon() {
  return (
    <svg {...common}>
      <circle cx="12" cy="12.5" r="8.5" />
      <path d="M12 7.5 V12.5 l3.5 2.2" />
    </svg>
  )
}

/** 숟가락과 젓가락 */
export function MealIcon() {
  return (
    <svg {...common}>
      <ellipse cx="7" cy="6.5" rx="3.1" ry="4.3" />
      <path d="M7 10.8 V20.5" />
      <path d="M14.5 3.5 V20.5" />
      <path d="M18.5 3.5 V20.5" />
    </svg>
  )
}

/** 확성기 — 공지 */
export function MegaphoneIcon() {
  return (
    <svg {...common}>
      <path d="M6 9.5 L14 5 v14 l-8 -4.5 Z" />
      <path d="M8.5 14.5 V19.5 h3 V16" />
      <path d="M17 9 a4.5 4.5 0 0 1 0 6" />
      <path d="M20 6.5 a8 8 0 0 1 0 11" />
    </svg>
  )
}

/** 연필 */
export function PencilIcon() {
  return (
    <svg {...common}>
      <path d="M4 20 v-4.5 L15.5 4 a2 2 0 0 1 2.8 0 L20 5.7 a2 2 0 0 1 0 2.8 L8.5 20 Z" />
      <path d="M14 5.5 L18.5 10" />
    </svg>
  )
}
