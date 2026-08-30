// 사진은 두 가지 크기로 올린다.
//
//   원본  2400px / 품질 0.92  — 확대해서 볼 때. 안내문 글씨까지 읽힌다.
//   사본   800px / 품질 0.80  — 목록과 미리보기용. 원본을 쓰면 홈 화면만 열어도
//                              몇 MB가 나가기 때문에 작은 걸 따로 둔다.

const FULL_SIZE = 2400
const FULL_QUALITY = 0.92

const THUMB_SIZE = 800
const THUMB_QUALITY = 0.8

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 읽지 못했어요. 다른 사진으로 해보세요.'))
    }
    img.src = url
  })
}

function toBase64(img, maxSize, quality) {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)

  const ctx = canvas.getContext('2d')
  // 줄일 때 계단현상을 줄여준다
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

/** 사진 한 장을 원본과 사본 두 벌로 만든다 */
export async function prepareImage(file) {
  const img = await loadImage(file)
  return {
    full: toBase64(img, FULL_SIZE, FULL_QUALITY),
    thumb: toBase64(img, THUMB_SIZE, THUMB_QUALITY),
  }
}

/** 확대해서 볼 원본 주소 */
export function imageUrl(name) {
  return `${import.meta.env.BASE_URL}images/${name}`
}

/** 목록에 띄울 작은 사본 주소 */
export function thumbUrl(name) {
  return `${import.meta.env.BASE_URL}images/thumbs/${name}`
}

/**
 * 일정에 달린 사진 목록을 꺼낸다.
 * 예전에 한 장만 넣던 형식(image)도 그대로 읽히게 해둔다.
 */
export function eventImages(event) {
  if (Array.isArray(event.images)) return event.images
  if (event.image) return [event.image]
  return []
}

/** 사본이 없는 예전 사진이면 원본으로 되돌린다 */
export function fallbackToFull(e, name) {
  if (e.currentTarget.dataset.fell) return
  e.currentTarget.dataset.fell = '1'
  e.currentTarget.src = imageUrl(name)
}
