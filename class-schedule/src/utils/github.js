import { GITHUB } from '../config'

// 폰에서 편집한 내용을 GitHub의 events.json에 바로 덮어쓴다.
// 저장되면 Vercel이 알아서 다시 배포하고, 1분쯤 뒤 모두의 화면이 바뀐다.

const TOKEN = 'class-schedule:token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN) || ''
  } catch {
    return ''
  }
}

export function saveToken(value) {
  try {
    localStorage.setItem(TOKEN, value.trim())
  } catch {
    // 저장이 막힌 환경 — 이번 접속에서는 JSON 복사를 쓰면 된다
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN)
  } catch {
    // 지울 게 없으면 넘어간다
  }
}

export function isConfigured() {
  return Boolean(GITHUB.owner && GITHUB.repo)
}

function endpoint(path) {
  return `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${path}`
}

/**
 * 사진이 올라갈 폴더.
 * events.json 이 있는 자리 옆에 images 폴더를 쓴다.
 * 예) class-schedule/public/events.json -> class-schedule/public/images
 */
function imageDir() {
  const parts = GITHUB.path.split('/')
  parts.pop()
  parts.push('images')
  return parts.join('/')
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }
}

/** GitHub은 파일 내용을 base64로 받는다. 한글이 깨지지 않게 UTF-8로 먼저 바꾼다. */
function toBase64(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

async function explain(res) {
  if (res.status === 401) return '토큰이 틀렸거나 만료됐어요. 다시 발급받아 주세요.'
  if (res.status === 403) return '이 저장소에 쓸 권한이 없어요. 토큰 권한을 확인해 주세요.'
  if (res.status === 404)
    return '저장소나 파일 경로를 찾을 수 없어요. config.js의 owner, repo를 확인해 주세요.'
  if (res.status === 409) return '누군가 방금 같은 파일을 고쳤어요. 새로고침 후 다시 시도해 주세요.'
  try {
    const body = await res.json()
    return body.message || `저장에 실패했어요 (${res.status})`
  } catch {
    return `저장에 실패했어요 (${res.status})`
  }
}

/**
 * 사진 한 장을 저장소에 올리고 파일 이름을 돌려준다.
 * 일정에는 이 이름만 저장해두고, 화면에 띄울 때 그때 받아온다.
 */
export async function uploadImage(base64) {
  if (!isConfigured()) throw new Error('config.js에 owner와 repo를 먼저 적어 주세요.')

  const token = getToken()
  if (!token) throw new Error('토큰을 먼저 등록해 주세요.')

  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`

  const res = await fetch(endpoint(`${imageDir()}/${name}`), {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({
      message: `사진 추가 ${name}`,
      content: base64,
      branch: GITHUB.branch,
    }),
  })

  if (!res.ok) throw new Error(await explain(res))

  return name
}

export async function saveToGithub(json) {
  if (!isConfigured()) throw new Error('config.js에 owner와 repo를 먼저 적어 주세요.')

  const token = getToken()
  if (!token) throw new Error('토큰이 등록되지 않았어요.')

  // 파일을 덮어쓰려면 지금 버전의 sha를 먼저 알아야 한다
  let sha
  const current = await fetch(`${endpoint(GITHUB.path)}?ref=${GITHUB.branch}&t=${Date.now()}`, {
    headers: headers(token),
  })

  if (current.ok) {
    sha = (await current.json()).sha
  } else if (current.status !== 404) {
    throw new Error(await explain(current))
  }

  const res = await fetch(endpoint(GITHUB.path), {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({
      message: `일정 업데이트 (${new Date().toLocaleDateString('ko-KR')})`,
      content: toBase64(json),
      branch: GITHUB.branch,
      ...(sha ? { sha } : {}),
    }),
  })

  if (!res.ok) throw new Error(await explain(res))
}
