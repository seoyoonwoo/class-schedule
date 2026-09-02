import { useEffect, useState } from 'react'
import {
  currentSubscription,
  isPushReady,
  subscribe,
  unsubscribe,
} from '../utils/push'

/**
 * 알림 받기 버튼.
 * 홈 화면 맨 아래에 두어, 앱을 둘러본 뒤에 켜게 한다.
 * 처음부터 알림 허용을 물으면 대부분 거절한다.
 */
export default function PushToggle() {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isPushReady()) {
      setChecked(true)
      return
    }
    currentSubscription()
      .then((sub) => setOn(Boolean(sub)))
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [])

  if (!isPushReady() || !checked) return null

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      if (on) {
        await unsubscribe()
        setOn(false)
      } else {
        await subscribe()
        setOn(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section">
      <div className="card push-card">
        <div className="push-text">
          <p className="push-title">{on ? '알림을 받고 있어요' : '알림 받기'}</p>
          <p className="push-desc">
            {on
              ? '수행평가나 시험 전에 알려드려요.'
              : '앱을 열지 않아도 수행평가나 시험 전에 알려드려요.'}
          </p>
        </div>

        <button
          className={`btn tiny${on ? ' ghost' : ''}`}
          disabled={busy}
          onClick={toggle}
        >
          {busy ? '...' : on ? '끄기' : '켜기'}
        </button>
      </div>

      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
    </section>
  )
}
