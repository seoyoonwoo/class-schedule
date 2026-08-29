// 폰 사진은 보통 3~5MB라 그대로 올리면 저장소가 금방 커지고 친구들 데이터도 낭비된다.
// 올리기 전에 브라우저에서 크기를 줄인다. 보통 300KB 안쪽으로 떨어진다.

const MAX_SIZE = 1400 // 긴 변 기준 픽셀
const QUALITY = 0.82

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

/** 사진을 줄여서 base64 문자열로 돌려준다 (GitHub이 base64를 요구한다) */
export async function shrinkToBase64(file) {
  const img = await loadImage(file)

  const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height))
  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)

  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)

  // "data:image/jpeg;base64,XXXX" 에서 뒤쪽만 떼어낸다
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

/** 화면에 미리보기로 띄울 임시 주소 */
export function previewUrl(file) {
  return URL.createObjectURL(file)
}

/** 저장된 파일 이름으로 실제 사진 주소를 만든다 */
export function imageUrl(name) {
  return `${import.meta.env.BASE_URL}images/${name}`
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
