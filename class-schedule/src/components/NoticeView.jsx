import { useEffect } from 'react'
import { formatKorean } from '../utils/dateUtils'
import { eventImages, fallbackToFull, thumbUrl } from '../utils/image'

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

        {notice.body && <p className="notice-view-text">{notice.body}</p>}

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
