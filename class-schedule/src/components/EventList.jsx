import { dday, ddayLabel, formatKorean } from '../utils/dateUtils'
import { typeStyle } from '../utils/eventTypes'

export default function EventList({ events, onSelect, emptyText }) {
  if (events.length === 0) {
    return <p className="empty-note">{emptyText}</p>
  }

  return (
    <div>
      {events.map((e) => {
        const style = typeStyle(e.type)
        return (
          <button
            key={e.id}
            className="event-row"
            onClick={() => onSelect(e.date)}
          >
            <span
              className="badge"
              style={{ background: style.hl, color: style.ink }}
            >
              {ddayLabel(dday(e.date))}
            </span>
            <span className="body">
              <span className="name">{e.title}</span>
              <span className="sub">
                {formatKorean(e.date)} · {e.type}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
