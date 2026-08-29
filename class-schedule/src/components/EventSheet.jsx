import { useEffect } from 'react'
import { formatKorean, formatSpan, isRange, statusLabel } from '../utils/dateUtils'
import { typeStyle } from '../utils/eventTypes'
import { eventImages, imageUrl } from '../utils/image'

export default function EventSheet({ date, events, onClose, onPhoto }) {
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

  if (!date) return null

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={`${formatKorean(date)} 일정`}>
        <div className="handle" />
        <h2>{formatKorean(date)}</h2>

        {events.map((e) => {
          const style = typeStyle(e.type)
          return (
            <div className="sheet-item" key={e.id}>
              <div className="meta">
                <span
                  className="tag"
                  style={{ background: style.hl, color: style.ink }}
                >
                  {e.type}
                </span>
                <span className="tag" style={{ background: '#eef0f5' }}>
                  {statusLabel(e)}
                </span>
              </div>
              <h2 style={{ fontSize: 20 }}>{e.title}</h2>
              {isRange(e) && <p className="span-line">{formatSpan(e)}</p>}
              {e.detail && <p className="memo">{e.detail}</p>}

              {eventImages(e).map((name, i, all) => (
                <button
                  key={name}
                  className="event-photo"
                  onClick={() => onPhoto(all, i)}
                  aria-label={`${e.title} 사진 ${i + 1} 크게 보기`}
                >
                  <img src={imageUrl(name)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )
        })}

        <button
          className="btn ghost"
          style={{ marginTop: 22 }}
          onClick={onClose}
        >
          닫기
        </button>
      </div>
    </>
  )
}
