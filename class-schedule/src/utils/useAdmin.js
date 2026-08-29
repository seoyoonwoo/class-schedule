import { useEffect, useState } from 'react'
import { ADMIN_KEY } from '../config'

const FLAG = 'class-schedule:admin'

/**
 * 편집 권한이 있는지 판별한다.
 *
 * 주소 뒤에 ?admin=열쇠 를 붙여 한 번 들어오면 이 기기에 표시가 남아서
 * 다음부터는 그냥 주소만 쳐도 편집 탭이 보인다.
 * 다른 사람 기기에는 이 표시가 없으니 편집 탭 자체가 나타나지 않는다.
 */
export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return localStorage.getItem(FLAG) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('admin')) return

    if (params.get('admin') === ADMIN_KEY) {
      try {
        localStorage.setItem(FLAG, '1')
      } catch {
        // 저장이 막힌 환경이면 이번 접속 동안만 편집할 수 있다
      }
      setIsAdmin(true)
    }

    // 주소창에서 열쇠를 지운다. 스크린샷이나 링크 공유로 새어나가지 않게.
    params.delete('admin')
    const rest = params.toString()
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (rest ? `?${rest}` : '')
    )
  }, [])

  function lock() {
    try {
      localStorage.removeItem(FLAG)
    } catch {
      // 지울 게 없으면 그냥 넘어간다
    }
    setIsAdmin(false)
  }

  return { isAdmin, lock }
}
