// 매일 한 번 실행돼서, 오늘 알려야 할 일정이 있으면 디스코드로 메시지를 보낸다.
// GitHub Actions가 대신 실행해 주기 때문에 컴퓨터를 켜둘 필요가 없다.
//
// 직접 테스트할 때:
//   WEBHOOK_URL="https://discord.com/api/webhooks/..." npm run notify

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(
  readFileSync(join(here, '..', 'public', 'events.json'), 'utf-8')
)

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const EMOJI = {
  수행평가: '📝',
  시험: '📖',
  행사: '🎉',
  준비물: '🎒',
  기타: '📌',
}

/** GitHub Actions 서버는 UTC라서, 한국 시간 기준 '오늘'을 직접 구한다 */
function todayInKorea() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate())
  )
}

function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = Date.UTC(y, m - 1, d)
  return Math.round((target - todayInKorea().getTime()) / 86400000)
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekday = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${m}월 ${d}일 (${weekday})`
}

// notifyBefore에 오늘 남은 일수가 들어있는 일정만 고른다
const due = data.events.filter((e) => {
  const left = daysUntil(e.date)
  const rules = e.notifyBefore || []
  return left === 0 || rules.includes(left)
})

if (due.length === 0) {
  console.log('오늘 알릴 일정 없음')
  process.exit(0)
}

const lines = due
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((e) => {
    const left = daysUntil(e.date)
    const tag = left === 0 ? '**오늘!**' : `**D-${left}**`
    const memo = e.detail ? `\n> ${e.detail}` : ''
    return `${EMOJI[e.type] || '📌'} ${tag} ${e.title} — ${formatDate(e.date)}${memo}`
  })

const message = `📅 **${data.className || '우리 반'} 일정 알림**\n\n${lines.join('\n\n')}`

const url = process.env.WEBHOOK_URL
if (!url) {
  console.log('WEBHOOK_URL이 없어서 화면에만 출력합니다.\n')
  console.log(message)
  process.exit(0)
}

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: message }),
})

if (!res.ok) {
  console.error(`전송 실패 (${res.status}): ${await res.text()}`)
  process.exit(1)
}

console.log(`${due.length}건 전송 완료`)
