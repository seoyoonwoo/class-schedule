import { formatKorean } from '../utils/dateUtils'

/** 확성기 아이콘. 앱의 형광펜 컨셉에 맞춰 뒤에 노란 칠을 깔았다. */
function Megaphone() {
  return (
    <svg className="notice-mark" viewBox="0 0 40 32" aria-hidden="true">
      <rect x="0" y="2" width="40" height="28" rx="6" fill="#FFE86B" opacity="0.5" />
      <path
        d="M9 12 L20 6 L20 26 L9 20 Z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M12 20 L12 26 L16 26 L16 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M25 11 Q 29 16 25 21"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M30 7 Q 37 16 30 25"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

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
        <Megaphone />
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
