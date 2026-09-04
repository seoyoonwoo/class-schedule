import { useEffect, useState } from 'react'
import { currentSubscription, isPushReady, subscribe } from '../utils/push'

/**
 * 알림 받기 버튼.
 * 홈 화면 맨 아래에 두어, 앱을 둘러본 뒤에 켜게 한다.
 * 처음부터 알림 허용을 물으면 대부분 거절하고, 한 번 거절하면 다시 물을 수 없다.
 *
 * 끄기 버튼은 두지 않는다. 껐다가 바로 다시 켜면 브라우저 구독이 꼬여서
 * 실패하는데, 정작 끌 일은 거의 없기 때문이다. 폰 설정에서 끄면 된다.
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

  async function turnOn() {
    setBusy(true)
    setError('')
    try {
      await subscribe()
      setOn(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // 켜진 뒤에는 상태만 보여준다
  if (on) {
    return (
      <section className="section">
        <div className="card push-card done">
          <span className="push-check" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                d="M5 12.5 L10 17.5 L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="push-text">
            <p className="push-title">알림을 받고 있어요</p>
            <p className="push-desc">
              수행평가나 시험 전에 알려드려요. 끄고 싶으면 폰 설정에서 이 앱의
              알림을 꺼 주세요.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section">
      <div className="card push-card">
        <div className="push-text">
          <p className="push-title">알림 받기</p>
          <p className="push-desc">
            앱을 열지 않아도 수행평가나 시험 전에 알려드려요.
          </p>
        </div>

        <button className="btn tiny" disabled={busy} onClick={turnOn}>
          {busy ? '...' : '켜기'}
        </button>
      </div>

      {error && (
        <p className="error" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </section>
  )
}
