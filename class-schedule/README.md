# 우리 반 일정

수행평가와 학급 행사를 한눈에 보는 모바일 웹앱.
모눈종이 위에 형광펜으로 칠한 플래너 느낌으로 만들었다.

- **홈** — 가장 가까운 일정의 D-day를 크게, 그 아래로 다가오는 일정 목록
- **달력** — 월별 달력. 일정 있는 날에 종류별 색 점이 찍히고, 누르면 상세가 뜬다
- **편집** — 폰에서 바로 일정 추가/삭제, 그리고 JSON 내보내기

---

## 1. 실행하기

VS Code에서 이 폴더를 열고 터미널(`Ctrl+``)에서:

```bash
npm install
npm run dev
```

터미널에 주소가 두 개 뜬다.

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.0.12:5173/     ← 이거
```

**Network 주소를 폰 브라우저에 치면 폰에서 바로 볼 수 있다.** (컴퓨터와 폰이 같은 와이파이여야 함)
코드를 고치면 폰 화면도 즉시 바뀌니까 이 상태로 개발하면 편하다.

---

## 2. 일정 넣기

두 가지 방법이 있다.

### 폰에서 (편함)

편집 탭에서 추가하면 된다. 단, **그 기기에만 저장된다.** 반 친구들 화면에도 보이게 하려면
편집 탭 맨 아래 `JSON 복사`를 누르고, 복사된 내용을 `src/data/events.json`에 통째로
붙여넣은 다음 GitHub에 올리면 된다.

### VS Code에서 직접

`src/data/events.json` 을 열어서 이렇게 추가한다.

```json
{
  "id": "2026-09-15-math",
  "title": "수학 수행평가",
  "type": "수행평가",
  "date": "2026-09-15",
  "detail": "2단원 서술형. 계산기 사용 불가.",
  "notifyBefore": [7, 3, 1]
}
```

| 항목 | 설명 |
| --- | --- |
| `id` | 겹치지만 않으면 아무거나. `날짜-과목` 형태를 추천 |
| `type` | `수행평가` `시험` `행사` `준비물` `기타` 중 하나 |
| `date` | 반드시 `YYYY-MM-DD` |
| `detail` | 비워도 된다 |
| `notifyBefore` | 며칠 전에 알릴지. `[7, 3, 1]`이면 일주일 전, 3일 전, 하루 전 |

색을 바꾸거나 종류를 더 만들고 싶으면 `src/utils/eventTypes.js` 만 고치면 된다.
앱 전체에 자동으로 반영된다.

---

## 3. 인터넷에 올리기 (Vercel, 무료)

1. GitHub에 이 폴더를 새 저장소로 올린다
2. [vercel.com](https://vercel.com) 에 GitHub 계정으로 로그인
3. `Add New → Project` → 저장소 선택 → `Deploy`

끝. 설정 건드릴 것 없다 (Vercel이 Vite 프로젝트를 알아서 인식한다).
`https://내저장소이름.vercel.app` 주소가 나오면 반 단톡방에 뿌리면 된다.

이후로는 GitHub에 push할 때마다 자동으로 다시 배포된다.

### 홈 화면에 추가하면 앱처럼 쓸 수 있다

- **아이폰**: 사파리에서 열고 → 공유 버튼 → `홈 화면에 추가`
- **안드로이드**: 크롬에서 열고 → 우측 상단 ⋮ → `홈 화면에 추가`

주소창 없이 전체 화면으로 뜬다.

---

## 4. 매일 아침 자동 알림 (디스코드)

컴퓨터를 켜둘 필요 없이 GitHub이 대신 실행해 준다. 무료다.

**1) 디스코드 웹훅 만들기**
반 디스코드 서버 → 알림 받을 채널 → `채널 편집` → `연동` → `웹후크` → `새 웹후크` → `웹후크 URL 복사`

**2) GitHub에 비밀값으로 등록**
저장소 → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

| | |
| --- | --- |
| Name | `WEBHOOK_URL` |
| Secret | 복사한 웹훅 주소 |

> 웹훅 주소는 절대 코드에 직접 쓰면 안 된다. 아는 사람이면 누구나 그 채널에 글을 쓸 수 있게 된다.

**3) 확인**
저장소 → `Actions` 탭 → `일정 알림` → `Run workflow` 를 눌러 바로 테스트해 볼 수 있다.

이제 매일 아침 7시에 `notifyBefore`에 걸린 일정이 디스코드로 간다.

시간을 바꾸려면 `.github/workflows/notify.yml`의 cron을 고치면 된다.
UTC 기준이라 **한국 시간에서 9를 빼면 된다.** (아침 8시 → `0 23 * * *`)

내 컴퓨터에서 미리 테스트해 보고 싶으면:

```bash
npm run notify
```

웹훅 주소 없이 실행하면 보낼 메시지를 터미널에 출력만 한다.

---

## 폴더 구조

```
src/
├── data/events.json        ← 일정. 여기를 제일 자주 고치게 된다
├── utils/
│   ├── dateUtils.js        ← D-day 계산, 달력 42칸 만들기
│   ├── eventTypes.js       ← 종류별 형광펜 색
│   └── useEvents.js        ← 저장/불러오기
├── components/
│   ├── DdayHero.jsx        ← 홈 맨 위 큰 D-day
│   ├── EventList.jsx       ← 다가오는 일정 목록
│   ├── CalendarView.jsx    ← 월별 달력
│   ├── EventSheet.jsx      ← 날짜 눌렀을 때 올라오는 상세
│   └── EditPanel.jsx       ← 편집 탭
├── styles.css              ← 색·간격은 맨 위 :root 에 모여 있다
└── App.jsx                 ← 탭 전환

scripts/notify.js           ← 알림 메시지 만들어서 보내기
.github/workflows/notify.yml ← 매일 자동 실행 설정
```

---

## 다음에 해보면 좋을 것

- 달력에서 일정을 바로 눌러 수정하기
- 급식 메뉴 API 연동 (나이스 교육정보 개방 포털에서 무료로 열려 있다)
- 시간표 탭 추가
- 반 친구들이 직접 일정을 제안하는 폼 (Supabase 같은 걸 붙이면 된다)

---

## 5. 나만 편집할 수 있게 하기

편집 탭은 기본적으로 **아무에게도 보이지 않는다.** 주소 뒤에 열쇠를 붙여 한 번
들어와야 나타나고, 그 표시는 그 기기에만 남는다.

**1) 열쇠 정하기** — `src/config.js` 의 `ADMIN_KEY` 를 아무도 못 맞출 값으로 바꾼다.

```js
export const ADMIN_KEY = 'yunwoo-2026-abc123'
```

**2) 편집 모드 켜기** — 내 폰에서 딱 한 번 이 주소로 들어간다.

```
https://내주소.vercel.app/?admin=yunwoo-2026-abc123
```

들어오면 주소창에서 열쇠가 자동으로 지워지고 편집 탭이 생긴다. 다음부터는 그냥
주소만 쳐도 편집 탭이 계속 보인다. 친구들 폰에는 애초에 탭이 없다.

끄고 싶으면 편집 탭 맨 아래 `편집 모드 끄기`.

> **알아둘 것**: 이 열쇠는 자물쇠가 아니라 문패에 가깝다. 브라우저 개발자도구를 열
> 줄 아는 사람이라면 찾아낼 수 있다. 다만 찾아내서 편집 탭을 열어도 **그 사람 폰
> 화면만 바뀔 뿐** 진짜 데이터는 못 건드린다. 진짜 데이터는 GitHub에 있고, 거기
> 쓰려면 아래 토큰이 필요하기 때문이다. 진짜 자물쇠는 GitHub이 채워준다.

---

## 6. 폰에서 바로 GitHub에 올리기 (선택)

여기까지 하면 `JSON 복사 → 파일에 붙여넣기 → push` 과정이 사라진다.
폰에서 일정 추가하고 버튼 한 번 누르면 1분 뒤 모두의 화면이 바뀐다.

**1) config.js 채우기**

```js
export const GITHUB = {
  owner: '내깃허브아이디',
  repo: 'class-schedule',
  branch: 'main',
  path: 'src/data/events.json',
}
```

**2) 토큰 발급** — GitHub → 우측 상단 프로필 → `Settings` → 맨 아래 `Developer settings`
→ `Personal access tokens` → **`Fine-grained tokens`** → `Generate new token`

| 항목 | 설정 |
| --- | --- |
| Expiration | 90일 정도 (무제한은 피할 것) |
| Repository access | `Only select repositories` → 이 저장소 하나만 |
| Permissions | `Repository permissions` → **Contents: Read and write** 만 |

**Contents 하나만** 켜야 한다. 다른 권한은 전부 `No access`로 두면 된다. 혹시 토큰이
새더라도 이 저장소의 파일 말고는 아무것도 못 건드린다.

**3) 앱에 등록** — 편집 탭 → `GitHub 토큰` 칸에 붙여넣기. 이 폰에만 저장된다.

**4) 사용** — 일정 고치고 `GitHub에 올리기`. Vercel이 자동으로 다시 배포한다.

> 토큰은 비밀번호와 같다. 절대 코드에 직접 쓰거나 캡처해서 남에게 보내지 말 것.
> 폰을 잃어버렸거나 실수로 노출했으면 GitHub에서 그 토큰을 삭제(Revoke)하면 즉시
> 무효가 된다.

---

## 7. 지난 일정은 알아서 사라진다

날짜가 지난 일정은 홈과 달력에서 자동으로 빠진다. 따로 지울 필요가 없다.

며칠 더 남겨두고 싶으면 `src/config.js` 에서:

```js
export const KEEP_PAST_DAYS = 3   // 지나고 사흘 더 보여준다
```

데이터에서 아예 지우고 싶으면 편집 탭의 `지난 일정 N개 정리` 버튼을 누르면 된다.
(지난 일정이 있을 때만 버튼이 나타난다)

디스코드 알림도 마찬가지로 알아서 멈춘다. 남은 날짜가 음수가 되면 `notifyBefore`에
있는 어떤 숫자와도 일치하지 않기 때문에 조건에 안 걸린다.
