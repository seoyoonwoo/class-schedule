import { dday, endDateOf, formatSpan, isRunning, statusLabel } from '../utils/dateUtils'
import { eventImages, imageUrl } from '../utils/image'
import { typeStyle } from '../utils/eventTypes'

function Photos({ event, onPhoto }) {
  const photos = eventImages(event)
  return photos.map((name, i) => (
    <button
      key={name}
      className="event-photo"
      onClick={() => onPhoto(photos, i)}
      aria-label={`${event.title} 사진 ${i + 1} 크게 보기`}
    >
      <img src={imageUrl(name)} alt="" loading="lazy" />
    </button>
  ))
}

/**
 * 홈 맨 위 큰 D-day.
 * 같은 날에 일정이 여러 개면 남은 날짜를 한 번만 크게 쓰고 그 아래에 모두 늘어놓는다.
 * 하나만 보여주면 나머지를 놓칠 수 있어서다.
 */
export default function DdayHero({ events, onPhoto }) {
  if (!events || events.length === 0) {
    return (
      <div className="card hero empty">
        <p className="eyebrow">다음 일정</p>
        <p className="title">아직 등록된 일정이 없어요.</p>
      </div>
    )
  }

  const lead = events[0]
  const label = statusLabel(lead)
  const running = label === '진행 중' && isRunning(lead)
  const urgent = running || (dday(lead.date) <= 3 && dday(endDateOf(lead)) >= 0)

  const ddayLine = (
    <p className={`dday${urgent ? ' urgent' : ''}${running ? ' running' : ''}`}>
      {label}
    </p>
  )

  // 하나뿐이면 지금까지처럼 제목을 위에 크게
  if (events.length === 1) {
    return (
      <div className="card hero">
        <p className="eyebrow">다음 일정</p>

        <h2 className="title">
          <span className="hl hl-swipe" style={{ '--hl': typeStyle(lead.type).hl }}>
            {lead.title}
          </span>
        </h2>

        {ddayLine}
        <p className="when">{formatSpan(lead)}</p>

        {lead.detail && <p className="memo">{lead.detail}</p>}
        <Photos event={lead} onPhoto={onPhoto} />
      </div>
    )
  }

  // 여럿이면 남은 날짜를 먼저 쓰고 항목을 나열한다
  return (
    <div className="card hero">
      <p className="eyebrow">다음 일정 {events.length}개</p>

      {ddayLine}

      <div className="hero-list">
        {events.map((e) => (
          <div className="hero-item" key={e.id}>
            <h2 className="title">
              <span className="hl hl-swipe" style={{ '--hl': typeStyle(e.type).hl }}>
                {e.title}
              </span>
            </h2>
            <p className="when">{formatSpan(e)}</p>
            {e.detail && <p className="memo">{e.detail}</p>}
            <Photos event={e} onPhoto={onPhoto} />
          </div>
        ))}
      </div>
    </div>
  )
}
