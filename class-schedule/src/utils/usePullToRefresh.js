import { useEffect, useRef, useState } from 'react'

const MAX_PULL = 90 // 이보다 더 당겨져 보이지는 않게
const TRIGGER = 60 // 이만큼 당기면 새로고침
const RESISTANCE = 0.5 // 손가락이 움직인 만큼 다 따라가면 너무 헐렁하다

/**
 * 화면을 아래로 당기면 새로고침.
 *
 * 홈 화면에 추가한 앱은 브라우저가 원래 해주던 '당겨서 새로고침'이 막혀 있다.
 * 그래서 직접 만들어야 앱을 껐다 켜지 않고도 새 일정을 받아올 수 있다.
 *
 * @param onRefresh 새로고침할 때 실행할 함수
 * @param blocked   상세 창이나 사진 뷰어가 떠 있으면 막는다
 */
export function usePullToRefresh(onRefresh, blocked) {
  const [pull, setPull] = useState(0)
  const start = useRef(null)

  useEffect(() => {
    function onStart(e) {
      // 맨 위에 있을 때만. 스크롤 중에 당겨지면 안 된다.
      if (blocked || window.scrollY > 0 || e.touches.length !== 1) return
      start.current = e.touches[0].clientY
    }

    function onMove(e) {
      if (start.current === null) return

      const dy = e.touches[0].clientY - start.current

      // 위로 올리거나 스크롤이 내려가면 취소
      if (dy <= 0 || window.scrollY > 0) {
        start.current = null
        setPull(0)
        return
      }

      setPull(Math.min(MAX_PULL, dy * RESISTANCE))
    }

    function onEnd() {
      if (start.current === null) return
      start.current = null

      setPull((current) => {
        if (current >= TRIGGER) onRefresh()
        return 0
      })
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)

    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [onRefresh, blocked])

  return {
    pull,
    ready: pull >= TRIGGER, // 놓으면 새로고침되는 상태
  }
}
