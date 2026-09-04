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

/**
 * 이 기기가 지금 알림을 받고 있는지.
 *
 * 구독 객체만 보면 안 된다. 폰 설정에서 알림을 꺼도 구독은 남아 있어서
 * 켜져 있는 것처럼 보인다. 권한까지 함께 확인해야 한다.
 */
export async function isSubscribed() {
  if (!isPushReady()) return false
  if (Notification.permission !== 'granted') return false

  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false

  return Boolean(await reg.pushManager.getSubscription())
}

/** 알림 켜기 */
export async function subscribe() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('알림이 차단되어 있어요. 폰 설정에서 허용해 주세요.')
  }

  await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)

  // ready는 '활성화된' 서비스워커를 돌려준다. register가 준 것을 그대로 쓰면
  // 아직 준비 중이라 첫 시도가 실패하고, 새로고침해야 되는 문제가 생긴다.
  const reg = await navigator.serviceWorker.ready

  // 이미 구독이 있으면 그대로 쓴다. 새로 만들면 주소가 바뀌어 중복이 쌓인다.
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8Array(PUSH.publicKey),
    }))

  const json = sub.toJSON()
  await table(
    'POST',
    { endpoint: json.endpoint, keys: json.keys },
    // 이미 있는 주소면 조용히 넘어간다
    { Prefer: 'resolution=ignore-duplicates' }
  )

  return sub
}
