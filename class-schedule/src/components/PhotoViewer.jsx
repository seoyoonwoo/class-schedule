import { useEffect, useRef, useState } from 'react'
import { imageUrl } from '../utils/image'

/**
 * 사진 전체화면 뷰어.
 * 폰에서 안내문이나 시간표 사진을 읽을 수 있게 확대까지 지원한다.
 * 사진을 누르면 2.5배로 커지고, 그 상태에서 손가락으로 밀어서 볼 수 있다.
 */
export default function PhotoViewer({ images, index, onClose }) {
  const [current, setCurrent] = useState(index)
  const [zoomed, setZoomed] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  })

  function go(step) {
    setZoomed(false)
    setCurrent((c) => (c + step + images.length) % images.length)
  }

  function toggleZoom() {
    setZoomed((z) => {
      // 축소로 돌아갈 때는 스크롤 위치도 처음으로
      if (z && scrollRef.current) scrollRef.current.scrollTo(0, 0)
      return !z
    })
  }

  const many = images.length > 1

  return (
    <div className="viewer" role="dialog" aria-label="사진 크게 보기">
      <div className="viewer-bar">
        <span className="viewer-count">
          {many ? `${current + 1} / ${images.length}` : ''}
        </span>
        <button className="viewer-x" onClick={onClose} aria-label="닫기">
          ×
        </button>
      </div>

      <div
        className={`viewer-stage${zoomed ? ' zoomed' : ''}`}
        ref={scrollRef}
        onClick={(e) => {
          // 사진 바깥을 누르면 닫는다
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <img
          src={imageUrl(images[current])}
          alt={`사진 ${current + 1}`}
          onClick={toggleZoom}
        />
      </div>

      <div className="viewer-foot">
        {many && (
          <button className="viewer-nav" onClick={() => go(-1)} aria-label="이전 사진">
            ‹
          </button>
        )}
        <span className="viewer-hint">
          {zoomed ? '사진을 누르면 원래 크기로' : '사진을 누르면 확대'}
        </span>
        {many && (
          <button className="viewer-nav" onClick={() => go(1)} aria-label="다음 사진">
            ›
          </button>
        )}
      </div>
    </div>
  )
}
