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
import { createHash } from 'node:crypto'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(
  readFileSync(join(here, '..', 'public', 'events.json'), 'utf-8')
)

const {
  VAPID_PRIVATE_KEY,
  VAPID_PUBLIC_KEY,
  SUPABASE_URL,
  SUPABASE_KEY,
} = process.env

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
  return new Date(
    Date.UTC(
      kst.getUTCFullYear(),
      kst.getUTCMonth(),
      kst.getUTCDate()
    )
  )
}

function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Math.round(
    (Date.UTC(y, m - 1, d) - todayInKorea().getTime()) /
      86400000
  )
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)

  return `${m}월 ${d}일 (${
    WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  })`
}

// endpoint 전체를 GitHub 로그에 노출하지 않고
// 같은 기기를 구분할 수 있는 익명 ID를 만든다.
function deviceId(endpoint = '') {
  return createHash('sha256')
    .update(endpoint)
    .digest('hex')
    .slice(0, 10)
}

let payload = null

if (TITLE) {
  // 직접 보내기
  payload = {
    title: TITLE,
    body: BODY,
  }
} else {
  // 자동 — 오늘 알릴 일정 찾기
  const due = (data.events || []).filter((e) => {
    const left = daysUntil(e.date)

    return (
      left === 0 ||
      (e.notifyBefore || []).includes(left)
    )
  })

  if (due.length === 0) {
    console.log('오늘 알릴 일정 없음')
    process.exit(0)
  }

  const lines = due
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const left = daysUntil(e.date)

      const when =
        left === 0
          ? '오늘'
          : `${left}일 뒤`

      return `${e.title} · ${when} (${formatDate(e.date)})`
    })

  payload = {
    title:
      due.length === 1
        ? due[0].title
        : `일정 ${due.length}개`,

    body: lines.join('\n'),
  }
}

// ---------- 보내기 ----------

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/subscriptions?select=*`,
  {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  }
)

if (!res.ok) {
  console.error(
    '구독 목록을 가져오지 못했습니다:',
    res.status
  )
  process.exit(1)
}

const subs = await res.json()

console.log(`${subs.length}개 기기에 보냅니다`)

let sent = 0
let failed = 0
const dead = []

for (const row of subs) {
  const id = deviceId(row.endpoint || '')

  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: row.keys,
      },
      JSON.stringify(payload)
    )

    sent++

    console.log(
      `✅ 전송 성공 [기기 ${id}]`
    )
  } catch (err) {
    failed++

    console.error(
      `❌ 전송 실패 [기기 ${id}]`
    )

    console.error(
      '  statusCode:',
      err?.statusCode ?? '없음'
    )

    console.error(
      '  name:',
      err?.name ?? '없음'
    )

    console.error(
      '  message:',
      err?.message ?? String(err)
    )

    console.error(
      '  body:',
      err?.body ?? '없음'
    )

    // 실제 키 값은 출력하지 않고
    // 키가 존재하는지와 문자열 길이만 확인
    console.error(
      '  endpoint 존재:',
      Boolean(row?.endpoint)
    )

    console.error(
      '  p256dh 존재:',
      Boolean(row?.keys?.p256dh),
      '/ 길이:',
      row?.keys?.p256dh?.length ?? 0
    )

    console.error(
      '  auth 존재:',
      Boolean(row?.keys?.auth),
      '/ 길이:',
      row?.keys?.auth?.length ?? 0
    )

    // 410, 404는 기존 코드와 똑같이
    // 만료된 구독으로 보고 목록에서 제거
    if (
      err?.statusCode === 410 ||
      err?.statusCode === 404
    ) {
      dead.push(row.endpoint)

      console.log(
        `🗑️ 만료된 구독으로 판단 [기기 ${id}]`
      )
    }
  }
}

// 죽은 주소 정리
for (const endpoint of dead) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?endpoint=eq.${encodeURIComponent(
      endpoint
    )}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  )
}

console.log('------------------------------')
console.log(
  `전송 결과: 성공 ${sent}개 / 실패 ${failed}개${
    dead.length
      ? ` / 만료 구독 ${dead.length}개 정리`
      : ''
  }`
)