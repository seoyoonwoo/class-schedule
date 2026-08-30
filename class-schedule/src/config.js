// ===========================================================
// 이 파일만 고치면 앱 동작을 바꿀 수 있다.
// ===========================================================

/**
 * 편집 탭을 여는 열쇠.
 * 주소 뒤에 ?admin=여기적은값 을 붙여서 접속하면 편집 탭이 나타난다.
 *
 *   https://내주소.vercel.app/?admin=yunwoo-2026
 *
 * 반드시 아무도 못 맞출 값으로 바꿔서 쓸 것. 반 이름이나 생일은 금방 들킨다.
 */
export const ADMIN_KEY = 'yunwoo-2026-x9k2'

/**
 * 날짜가 지난 일정을 며칠까지 더 보여줄지.
 * 0이면 당일까지만 보이고 다음 날 사라진다. 3이면 사흘 더 남아 있는다.
 */
export const KEEP_PAST_DAYS = 0

/**
 * 폰에서 바로 GitHub에 저장하고 싶을 때만 채우면 된다.
 * 비워두면 편집 탭에서 'JSON 복사'만 쓸 수 있다. (README 5번 참고)
 */
export const GITHUB = {
  owner: 'seoyoonwoo',
  repo: 'class-schedule',
  branch: 'main',
  path: 'class-schedule/public/events.json',
}


export const SCHOOL = {
  key: '080758105f74473d88e777010e860f81',
  office: 'J10',
  code: '7530138',
  grade: 1,
  classNo: 11,
}