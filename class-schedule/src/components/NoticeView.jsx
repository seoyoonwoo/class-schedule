import { useEffect } from 'react'
import { formatKorean } from '../utils/dateUtils'
import { eventImages, fallbackToFull, thumbUrl } from '../utils/image'

// http:// 나 https:// 로 시작하는 주소를 찾는다.
// 뒤에 붙은 문장부호까지 링크에 들어가지 않도록 끝부분은 따로 잘라낸다.
const URL_PATTERN = /(https?:\/\/[^\s<>()"']+)/g

/**
 * 글 속의 주소를 눌러서 열 수 있는 링크로 바꾼다.
 * 나머지 글자는 그대로 두기 때문에 줄바꿈도 유지된다.
 */
function linkify(text) {
  return text.split(URL_PATTERN).map((part, i) => {
    if (!part.match(/^https?:\/\//)) return part

    // "주소입니다." 처럼 끝에 붙은 마침표는 주소에서 뺀다
    const trail = part.match(/[.,;:!?)\]]+$/)
    const href = trail ? part.slice(0, -trail[0].length) : part

    return (
      <span key={i}>
        <a
          className="notice-link"
          href={href}
          target="_blank"
          rel="noreferrer noopener"
        >
          {href}
        </a>
        {trail ? trail[0] : ''}
      </span>
    )
  })
}

/**
 * 공지 상세. 아래에서 올라오는 창이 아니라 화면을 꽉 채운다.
 * 안내문 사진과 긴 글을 읽어야 하는 경우가 많아서다.
 */
export default function NoticeView({ notice, onClose, onPhoto }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const photos = eventImages(notice)

  return (
    <div className="notice-view">
      <header className="notice-view-bar">
        <button className="notice-back" onClick={onClose} aria-label="닫기">
          ‹
        </button>
        <span>공지</span>
      </header>

      <div className="notice-view-body">
        <h1>{notice.title}</h1>
        {notice.postedAt && (
          <p className="notice-view-date">{formatKorean(notice.postedAt)}</p>
        )}

        {notice.body && (
          <p className="notice-view-text">{linkify(notice.body)}</p>
        )}

        {photos.map((name, i) => (
          <button
            key={name}
            className="event-photo"
            onClick={() => onPhoto(photos, i)}
            aria-label={`사진 ${i + 1} 크게 보기`}
          >
            <img
              src={thumbUrl(name)}
              alt=""
              loading="lazy"
              onError={(e) => fallbackToFull(e, name)}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
