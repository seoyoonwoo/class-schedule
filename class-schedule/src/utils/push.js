import { PUSH } from '../config'

// 웹 푸시 알림.
//
// 앱을 열지 않아도 폰에 알림이 뜬다. 동작 방식은 이렇다.
//   1. 친구가 '알림 받기'를 누르면 브라우저가 고유한 주소를 하나 만들어 준다
//   2. 그 주소를 Supabase에 저장해 둔다
//   3. 알림을 보낼 때 저장된 주소들로 메시지를 쏜다
//
// 주소만으로는 누구인지 알 수 없다. 이름도 폰 번호도 저장하지 않는다.

export function isPushReady() {
  return Boolean(
    PUSH?.publicKey &&
      PUSH?.supabaseUrl &&
      PUSH?.supabaseKey &&
      'serviceWorker' in navigator &&
      'PushManager' in window
  )
}

/** 브라우저가 요구하는 형식으로 공개키를 바꾼다 */
function toUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function table(method, body, extraHeaders = {}) {
  const res = await fetch(`${PUSH.supabaseUrl}/rest/v1/subscriptions`, {
    method,
        headers: {
      apikey: PUSH.supabaseKey,
      Authorization: `Bearer ${PUSH.supabaseKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok && res.status !== 409) {
    throw new Error('알림 설정을 저장하지 못했어요.')
  }
  return res
}

/** 이 기기가 이미 알림을 받고 있는지 */
export async function currentSubscription() {
  if (!isPushReady()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return null
  return reg.pushManager.getSubscription()
}

/** 알림 켜기 */
export async function subscribe() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('알림이 차단되어 있어요. 폰 설정에서 허용해 주세요.')
  }

  const reg = await navigator.serviceWorker.register(
    `${import.meta.env.BASE_URL}sw.js`
  )
  await navigator.serviceWorker.ready

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: toUint8Array(PUSH.publicKey),
  })

  const json = sub.toJSON()
  await table(
    'POST',
    { endpoint: json.endpoint, keys: json.keys },
    // 이미 있는 주소면 조용히 넘어간다
    { Prefer: 'resolution=ignore-duplicates' }
  )

  return sub
}

/** 알림 끄기 */
export async function unsubscribe() {
  const sub = await currentSubscription()
  if (!sub) return

  const endpoint = encodeURIComponent(sub.endpoint)
  await fetch(
    `${PUSH.supabaseUrl}/rest/v1/subscriptions?endpoint=eq.${endpoint}`,
    {
      method: 'DELETE',
            headers: {
        apikey: PUSH.supabaseKey,
        Authorization: `Bearer ${PUSH.supabaseKey}`,
      },
    }
  )

  await sub.unsubscribe()
}
