import { formatSpan, statusLabel } from '../utils/dateUtils'
import { typeStyle } from '../utils/eventTypes'

export default function EventList({ events, onSelect }) {
  if (events.length === 0) return null

  return (
    <div>
      {events.map((e) => {
        const style = typeStyle(e.type)
        return (
          <button
            key={e.id}
            className="event-row"
            onClick={() => onSelect(e)}
          >
            <span
              className="badge"
              style={{ background: style.hl, color: style.ink }}
            >
              {statusLabel(e)}
            </span>
            <span className="body">
              <span className="name">{e.title}</span>
              <span className="sub">
                {formatSpan(e)} · {e.type}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
