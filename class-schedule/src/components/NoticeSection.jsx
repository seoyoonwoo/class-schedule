import { formatKorean } from '../utils/dateUtils'
import { MegaphoneIcon } from './TabIcons'

// 이 개수를 넘으면 칸 안에서 스크롤된다
const VISIBLE_ROWS = 3


/**
 * 홈 화면의 공지 칸.
 * 일정과 달리 날짜로 사라지지 않고, 올린 날짜를 함께 보여준다.
 */
export default function NoticeSection({ notices, onSelect, isNew }) {
  return (
    <section className="section">
      <p className="section-label notice-label">
        <MegaphoneIcon />
        공지
      </p>

      {notices.length === 0 ? (
        <p className="section-empty">공지가 없어요</p>
      ) : (
        // 공지는 쌓이기만 하고 잘 지우지 않는다. 칸 높이를 고정해서
        // 홈 화면이 공지로 꽉 차 일정이 밀려나지 않게 한다.
        <div className="card notice-card">
          {notices.map((n) => (
            <button
              key={n.id}
              className="notice-row"
              onClick={() => onSelect(n)}
            >
              <span className="notice-body">
                <span className="notice-title">
                  {isNew?.(n) && <span className="new-dot">NEW</span>}
                  {n.title}
                </span>
                {n.postedAt && (
                  <span className="notice-date">{formatKorean(n.postedAt)}</span>
                )}
              </span>
              <span className="notice-arrow">›</span>
            </button>
          ))}
        </div>
      )}

      {notices.length > VISIBLE_ROWS && (
        <p className="notice-more">밀어서 지난 공지 보기</p>
      )}
    </section>
  )
}
