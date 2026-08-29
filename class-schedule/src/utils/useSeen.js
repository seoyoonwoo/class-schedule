import { useEffect, useRef, useState } from 'react'

const KEY = 'class-schedule:seen'
const MARK_AFTER = 3000 // 3초 이상 머물러야 읽은 걸로 친다

/**
 * 일정 하나를 구분하는 값.
 * 내용이 수정되면 updatedAt이 바뀌므로 NEW가 다시 붙는다.
 * 시험 날짜가 바뀌었는데 아무 표시가 없으면 그게 더 위험해서다.
 */
function stampOf(event) {
  return `${event.id}@${event.updatedAt || ''}`
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * 지난번에 앱을 열었을 때 이후로 새로 생기거나 수정된 일정을 알려준다.
 *
 * 표시는 이번에 앱을 켜 있는 동안 계속 남아 있다가, 다음에 열면 사라진다.
 * 열자마자 없어지면 정작 보기도 전에 놓치기 때문이다.
 */
export function useSeen(events) {
  // 앱을 켠 순간의 기록을 그대로 들고 간다. 중간에 바뀌지 않는다.
  const [seenAtOpen] = useState(() => new Set(load()))
  const marked = useRef(false)

  const signature = events.map(stampOf).join('|')

  useEffect(() => {
    if (events.length === 0 || marked.current) return

    const timer = setTimeout(() => {
      marked.current = true
      try {
        // 지금 있는 일정만 저장해서 기록이 무한정 쌓이지 않게 한다
        localStorage.setItem(KEY, JSON.stringify(events.map(stampOf)))
      } catch {
        // 저장이 막힌 환경이면 매번 NEW가 뜨는 정도의 불편만 있다
      }
    }, MARK_AFTER)

    return () => clearTimeout(timer)
  }, [signature, events])

  const firstEver = seenAtOpen.size === 0

  return function isNew(event) {
    // 처음 써보는 사람에게 전부 NEW를 띄우면 의미가 없다
    if (firstEver) return false
    return !seenAtOpen.has(stampOf(event))
  }
}
