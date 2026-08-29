import { dday, ddayLabel, formatKorean } from '../utils/dateUtils'
import { typeStyle } from '../utils/eventTypes'

export default function DdayHero({ event }) {
  if (!event) {
    return (
      <div className="card hero empty">
        <p className="eyebrow">다음 일정</p>
        <p className="title">예정된 일정이 없어요. 편집 탭에서 추가해 보세요.</p>
      </div>
    )
  }

  const n = dday(event.date)
  const style = typeStyle(event.type)

  return (
    <div className="card hero">
      <p className="eyebrow">다음 일정</p>

      <h2 className="title">
        <span className="hl hl-swipe" style={{ '--hl': style.hl }}>
          {event.title}
        </span>
      </h2>

      <p className={`dday${n <= 3 ? ' urgent' : ''}`}>{ddayLabel(n)}</p>
      <p className="when">{formatKorean(event.date)}</p>

      {event.detail && <p className="memo">{event.detail}</p>}
    </div>
  )
}
