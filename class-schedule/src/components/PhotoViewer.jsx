import { useEffect, useRef, useState } from 'react'
import { imageUrl, thumbUrl } from '../utils/image'

const MAX_SCALE = 5
const SWIPE_THRESHOLD = 60 // 이만큼 밀어야 다음 사진으로 넘어간다

function distanceBetween(touches) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

function centerOf(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  }
}

/**
 * 사진 전체화면 뷰어.
 *
 * 두 손가락으로 벌리면 확대되고, 확대한 상태에서 끌면 움직인다.
 * 원래 크기일 때 좌우로 밀면 다음 사진으로 넘어간다.
 * 사진 앱에서 쓰던 방식 그대로라 따로 배울 게 없다.
 */
export default function PhotoViewer({ images, index: startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex)
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragX, setDragX] = useState(0) // 사진을 넘기는 중의 미리보기 이동

  const [ready, setReady] = useState(false) // 원본이 도착했는지
  const [saving, setSaving] = useState(false)

  const stageRef = useRef(null)
  const gesture = useRef(null)
  const lastTap = useRef(0)

  const many = images.length > 1
  const zoomed = scale > 1.02

  // 사진을 넘기면 확대 상태를 되돌린다
  useEffect(() => {
    setScale(1)
    setPos({ x: 0, y: 0 })
    setDragX(0)
    setReady(false)

    // 원본은 용량이 크다. 먼저 작은 사본을 띄워두고 다 받아지면 바꾼다.
    const full = new Image()
    full.onload = () => setReady(true)
    full.onerror = () => setReady(true)
    full.src = imageUrl(images[index])
  }, [index, images])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length])

  function step(delta) {
    if (images.length < 2) return
    setIndex((i) => (i + delta + images.length) % images.length)
  }

  /** 확대한 사진이 화면 밖으로 너무 빠져나가지 않게 잡아준다 */
  function clamp(next, s) {
    const el = stageRef.current
    if (!el) return next
    const r = el.getBoundingClientRect()
    const maxX = Math.max(0, (r.width * (s - 1)) / 2)
    const maxY = Math.max(0, (r.height * (s - 1)) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    }
  }

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      gesture.current = {
        mode: 'pinch',
        startDist: distanceBetween(e.touches),
        startScale: scale,
        startPos: pos,
        startCenter: centerOf(e.touches),
      }
      return
    }

    if (e.touches.length === 1) {
      const t = e.touches[0]
      gesture.current = {
        mode: zoomed ? 'pan' : 'swipe',
        x0: t.clientX,
        y0: t.clientY,
        startPos: pos,
        moved: 0,
      }
    }
  }

  function onTouchMove(e) {
    const g = gesture.current
    if (!g) return

    if (g.mode === 'pinch' && e.touches.length === 2) {
      const ratio = distanceBetween(e.touches) / g.startDist
      const next = Math.min(MAX_SCALE, Math.max(1, g.startScale * ratio))

      // 손가락 사이 지점을 기준으로 커지게 해서 보던 곳이 유지되게 한다
      const c = centerOf(e.touches)
      const shift = next / g.startScale
      setScale(next)
      setPos(
        clamp(
          {
            x: c.x - g.startCenter.x + g.startPos.x * shift,
            y: c.y - g.startCenter.y + g.startPos.y * shift,
          },
          next
        )
      )
      return
    }

    if (e.touches.length !== 1) return
    const t = e.touches[0]
    const dx = t.clientX - g.x0
    const dy = t.clientY - g.y0
    g.moved = Math.hypot(dx, dy)

    if (g.mode === 'pan') {
      setPos(clamp({ x: g.startPos.x + dx, y: g.startPos.y + dy }, scale))
    } else if (g.mode === 'swipe' && many) {
      setDragX(dx)
    }
  }

  function onTouchEnd(e) {
    const g = gesture.current

    // 두 손가락 중 하나를 떼면 남은 손가락으로 이어서 조작하게 한다
    if (e.touches.length === 1 && g?.mode === 'pinch') {
      const t = e.touches[0]
      gesture.current = {
        mode: zoomed ? 'pan' : 'swipe',
        x0: t.clientX,
        y0: t.clientY,
        startPos: pos,
        moved: 0,
      }
      return
    }
    if (e.touches.length > 0) return

    gesture.current = null

    if (g?.mode === 'swipe') {
      if (Math.abs(dragX) > SWIPE_THRESHOLD) {
        step(dragX < 0 ? 1 : -1)
      }
      setDragX(0)
    }

    // 거의 원래 크기면 딱 맞춰 되돌린다
    if (scale < 1.05) {
      setScale(1)
      setPos({ x: 0, y: 0 })
    }

    // 두 번 톡톡 치면 확대 / 축소
    if (g && g.moved < 10) {
      const now = Date.now()
      if (now - lastTap.current < 300) {
        if (zoomed) {
          setScale(1)
          setPos({ x: 0, y: 0 })
        } else {
          setScale(2.5)
        }
        lastTap.current = 0
      } else {
        lastTap.current = now
      }
    }
  }

  /**
   * 사진 저장.
   *
   * 아이폰 사파리는 다운로드가 제대로 안 되는 대신 공유 시트를 띄울 수 있다.
   * 거기서 '이미지 저장'을 누르면 사진첩에 들어간다.
   * 안드로이드와 컴퓨터는 그냥 내려받는다.
   */
  async function save() {
    setSaving(true)
    try {
      const url = imageUrl(images[index])
      const blob = await (await fetch(url)).blob()
      const name = images[index]
      const file = new File([blob], name, { type: blob.type || 'image/jpeg' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else {
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = name
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(objectUrl)
      }
    } catch {
      // 사용자가 공유 창을 닫은 경우도 여기로 온다. 알릴 필요는 없다.
    } finally {
      setSaving(false)
    }
  }

  /** 마우스 휠로도 확대되게 (컴퓨터에서 볼 때) */
  function onWheel(e) {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 4) return
    const next = Math.min(MAX_SCALE, Math.max(1, scale - e.deltaY * 0.003))
    setScale(next)
    if (next === 1) setPos({ x: 0, y: 0 })
  }

  return (
    <div className="viewer" role="dialog" aria-label="사진 크게 보기">
      <div className="viewer-bar">
        <span className="viewer-count">
          {many ? `${index + 1} / ${images.length}` : ''}
        </span>
        <div className="viewer-actions">
          <button
            className="viewer-x"
            onClick={save}
            disabled={saving}
            aria-label="사진 저장"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button className="viewer-x" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
      </div>

      <div
        className="viewer-stage"
        ref={stageRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onWheel={onWheel}
        onClick={(e) => {
          if (e.target === e.currentTarget && !zoomed) onClose()
        }}
      >
        <img
          src={ready ? imageUrl(images[index]) : thumbUrl(images[index])}
          onError={(e) => {
            // 사본이 없는 예전 사진이면 원본으로
            if (!ready) setReady(true)
          }}
          alt={`사진 ${index + 1}`}
          draggable={false}
          style={{
            transform: `translate(${pos.x + dragX}px, ${pos.y}px) scale(${scale})`,
            transition: gesture.current ? 'none' : 'transform 0.2s ease',
          }}
        />
      </div>

      <div className="viewer-foot">
        {many && (
          <button className="viewer-nav" onClick={() => step(-1)} aria-label="이전 사진">
            ‹
          </button>
        )}
        <span className="viewer-hint">
          {zoomed
            ? '끌어서 움직이기'
            : many
              ? '두 손가락으로 확대 · 밀어서 넘기기'
              : '두 손가락으로 확대'}
        </span>
        {many && (
          <button className="viewer-nav" onClick={() => step(1)} aria-label="다음 사진">
            ›
          </button>
        )}
      </div>
    </div>
  )
}
