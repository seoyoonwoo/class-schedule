/**
 * 데이터 출처 표시.
 * 시간표, 급식, 학사일정은 교육부가 공개한 자료를 그대로 받아온다.
 * 공공데이터를 쓸 때는 어디서 온 것인지 밝히는 게 맞다.
 */
export default function DataSource() {
  return (
    <p className="data-source">
      출처{' '}
      <a
        href="https://open.neis.go.kr"
        target="_blank"
        rel="noreferrer noopener"
      >
        나이스 교육정보 개방 포털
      </a>
    </p>
  )
}
