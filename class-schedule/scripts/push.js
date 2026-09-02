// 저장된 모든 기기로 알림을 보낸다.
//
// 두 가지로 쓴다.
//   1. 매일 아침 자동 — GitHub Actions가 실행. notifyBefore에 걸린 일정을 알린다
//   2. 직접 보내기    — Actions 화면에서 제목과 내용을 적고 실행
//
// 필요한 값 (GitHub Secrets)
//   VAPID_PRIVATE_KEY   비밀키
//   SUPABASE_URL        프로젝트 주소
//   SUPABASE_KEY        service_role 키 (목록을 읽어야 해서 이건 강한 키가 필요하다)

import webpush from 'web-push'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(
  readFileSync(join(here, '..', 'public', 'events.json'), 'utf-8')
)

const { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, SUPABASE_URL, SUPABASE_KEY } = process.env
const TITLE = process.env.PUSH_TITLE || ''
const BODY = process.env.PUSH_BODY || ''

if (!VAPID_PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('필요한 설정이 없습니다. GitHub Secrets를 확인하세요.')
  process.exit(1)
}

webpush.setVapidDetails(
  'mailto:noreply@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

// ---------- 보낼 내용 정하기 ----------

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function todayInKorea() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()))
}

function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - todayInKorea().getTime()) / 86400000)
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${m}월 ${d}일 (${WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`
}

let payload = null

if (TITLE) {
  // 직접 보내기
  payload = { title: TITLE, body: BODY }
} else {
  // 자동 — 오늘 알릴 일정 찾기
  const due = (data.events || []).filter((e) => {
    const left = daysUntil(e.date)
    return left === 0 || (e.notifyBefore || []).includes(left)
  })

  if (due.length === 0) {
    console.log('오늘 알릴 일정 없음')
    process.exit(0)
  }

  const lines = due
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const left = daysUntil(e.date)
      const when = left === 0 ? '오늘' : `${left}일 뒤`
      return `${e.title} · ${when} (${formatDate(e.date)})`
    })

  payload = {
    title: due.length === 1 ? due[0].title : `일정 ${due.length}개`,
    body: lines.join('\n'),
  }
}

// ---------- 보내기 ----------

const res = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=*`, {
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
})

if (!res.ok) {
  console.error('구독 목록을 가져오지 못했습니다:', res.status)
  process.exit(1)
}

const subs = await res.json()
console.log(`${subs.length}개 기기에 보냅니다`)

let sent = 0
const dead = []

for (const row of subs) {
  try {
    await webpush.sendNotification(
      { endpoint: row.endpoint, keys: row.keys },
      JSON.stringify(payload)
    )
    sent++
  } catch (err) {
    // 410, 404는 앱을 지웠거나 알림을 끈 기기다. 목록에서 빼준다.
    if (err.statusCode === 410 || err.statusCode === 404) {
      dead.push(row.endpoint)
    } else {
      console.error('전송 실패:', err.statusCode)
    }
  }
}

// 죽은 주소 정리
for (const endpoint of dead) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
    {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    }
  )
}

console.log(`${sent}개 전송 완료${dead.length ? `, ${dead.length}개 정리` : ''}`)
