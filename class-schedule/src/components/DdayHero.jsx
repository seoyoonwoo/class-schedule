import { dday, endDateOf, formatSpan, isRunning, statusLabel } from '../utils/dateUtils'
import { typeStyle } from '../utils/eventTypes'
import { eventImages, imageUrl } from '../utils/image'

export default function DdayHero({ event, onPhoto }) {
  if (!event) {
    return (
      <div className="card hero empty">
        <p className="eyebrow">다음 일정</p>
        <p className="title">예정된 일정이 없어요. 편집 탭에서 추가해 보세요.</p>
      </div>
    )
  }

  const style = typeStyle(event.type)
  const label = statusLabel(event)
  const running = isRunning(event) && label === '진행 중'
  const urgent = running || (dday(event.date) <= 3 && dday(endDateOf(event)) >= 0)
  const photos = eventImages(event)

  return (
    <div className="card hero">
      <p className="eyebrow">다음 일정</p>

      <h2 className="title">
        <span className="hl hl-swipe" style={{ '--hl': style.hl }}>
          {event.title}
        </span>
      </h2>

      <p className={`dday${urgent ? ' urgent' : ''}${running ? ' running' : ''}`}>
        {label}
      </p>
      <p className="when">{formatSpan(event)}</p>

      {event.detail && <p className="memo">{event.detail}</p>}

      {photos.map((name, i) => (
        <button
          key={name}
          className="event-photo"
          onClick={() => onPhoto(photos, i)}
          aria-label={`${event.title} 사진 ${i + 1} 크게 보기`}
        >
          <img src={imageUrl(name)} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  )
}
