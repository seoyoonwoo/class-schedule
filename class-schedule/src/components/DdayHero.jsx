import { dday, endDateOf, formatSpan, isRunning, statusLabel } from '../utils/dateUtils'
import { eventImages, fallbackToFull, thumbUrl } from '../utils/image'
import { typeStyle } from '../utils/eventTypes'

/**
 * 히어로에서는 사진을 펼치지 않는다.
 * 사진이 크게 박히면 아래 일정들이 화면 밖으로 밀려나기 때문에,
 * 버튼만 두고 누르면 전체화면으로 띄운다.
 */
function PhotoButton({ event, onPhoto }) {
  const photos = eventImages(event)
  if (photos.length === 0) return null

  return (
    <button className="photo-open" onClick={() => onPhoto(photos, 0)}>
      <img
        className="photo-thumb"
        src={thumbUrl(photos[0])}
        alt=""
        loading="lazy"
        onError={(e) => fallbackToFull(e, photos[0])}
      />
      <span>사진 {photos.length}장 보기</span>
      <span className="photo-open-arrow">›</span>
    </button>
  )
}

/**
 * 홈 맨 위 큰 D-day.
 * 같은 날에 일정이 여러 개면 남은 날짜를 한 번만 크게 쓰고 그 아래에 모두 늘어놓는다.
 * 하나만 보여주면 나머지를 놓칠 수 있어서다.
 */
export default function DdayHero({ events, onPhoto, isNew }) {
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
          {isNew?.(lead) && <span className="new-dot">NEW</span>}
          <span className="hl hl-swipe" style={{ '--hl': typeStyle(lead.type).hl }}>
            {lead.title}
          </span>
        </h2>

        {ddayLine}
        <p className="when">{formatSpan(lead)}</p>

        {lead.detail && <p className="memo">{lead.detail}</p>}
        <PhotoButton event={lead} onPhoto={onPhoto} />
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
              {isNew?.(e) && <span className="new-dot">NEW</span>}
              <span className="hl hl-swipe" style={{ '--hl': typeStyle(e.type).hl }}>
                {e.title}
              </span>
            </h2>
            <p className="when">{formatSpan(e)}</p>
            {e.detail && <p className="memo">{e.detail}</p>}
            <PhotoButton event={e} onPhoto={onPhoto} />
          </div>
        ))}
      </div>
    </div>
  )
}
