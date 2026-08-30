import { useRef, useState } from 'react'
import {
  datesBetween,
  eventDates,
  formatKorean,
  formatSpan,
  sortByDate,
  toKey,
  today,
} from '../utils/dateUtils'
import DayMultiPicker from './DayMultiPicker'
import { TYPE_NAMES, typeStyle } from '../utils/eventTypes'
import {
  clearToken,
  getToken,
  isConfigured,
  saveToGithub,
  saveToken,
  uploadImage,
} from '../utils/github'
import { eventImages, prepareImage, thumbUrl } from '../utils/image'

const NOTIFY_OPTIONS = [14, 7, 3, 1]

export default function EditPanel({ store, onToast, onLock }) {
  const formRef = useRef(null)

  // 폼
  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toKey(today()))
  const [multi, setMulti] = useState(false)
  const [picked, setPicked] = useState([]) // 여러 날일 때 실제로 하는 날들
  const [type, setType] = useState('수행평가')
  const [detail, setDetail] = useState('')
  const [notify, setNotify] = useState([7, 3, 1])
  const [photos, setPhotos] = useState([]) // [{ name, preview }]
  const [error, setError] = useState('')

  // 업로드 / 발행
  const [progress, setProgress] = useState('') // "2/3" 형태
  const [token, setTokenInput] = useState(getToken())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmId, setConfirmId] = useState(null) // 삭제를 한 번 누른 항목

  // 공지 작성
  const noticeRef = useRef(null)
  const [nEditingId, setNEditingId] = useState(null)
  const [nTitle, setNTitle] = useState('')
  const [nBody, setNBody] = useState('')
  const [nPhotos, setNPhotos] = useState([])
  const [nError, setNError] = useState('')
  const [nConfirmId, setNConfirmId] = useState(null)

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setDate(toKey(today()))
    setMulti(false)
    setPicked([])
    setType('수행평가')
    setDetail('')
    setNotify([7, 3, 1])
    setPhotos([])
    setError('')
  }

  function startEdit(event) {
    setEditingId(event.id)
    setTitle(event.title)
    setDate(event.date)
    const days = eventDates(event)
    setMulti(days.length > 1)
    setPicked(days)
    setType(event.type)
    setDetail(event.detail || '')
    setNotify(event.notifyBefore || [])
    setPhotos(eventImages(event).map((name) => ({ name, preview: thumbUrl(name) })))
    setError('')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const sorted = [...picked].sort()

  function toggleDay(key) {
    setPicked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
    if (error) setError('')
  }

  /**
   * 삭제는 두 번 눌러야 지워진다.
   * 한 번 누르면 버튼이 '정말 삭제'로 바뀌고, 4초 안에 다시 누르지 않으면 되돌아간다.
   */
  function askDelete(id) {
    setConfirmId(id)
    setTimeout(() => setConfirmId((cur) => (cur === id ? null : cur)), 4000)
  }

  function toggleMulti(on) {
    setMulti(on)
    setPicked(on ? [date] : [])
    if (error) setError('')
  }

  function toggleNotify(day) {
    setNotify((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  async function pickPhotos(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // 같은 파일을 다시 골라도 동작하게
    if (files.length === 0) return

    setError('')
    const added = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      setProgress(`${i + 1}/${files.length}`)
      try {
        const sized = await prepareImage(file)
        const name = await uploadImage(sized)
        // 미리보기는 작은 사본으로 충분하다
        added.push({ name, preview: `data:image/jpeg;base64,${sized.thumb}` })
      } catch (err) {
        setError(err.message)
        break // 한 장이 실패하면 멈춘다. 앞서 올라간 건 그대로 쓴다
      }
    }

    setProgress('')
    if (added.length > 0) setPhotos((prev) => [...prev, ...added])
  }

  function removePhoto(name) {
    setPhotos((prev) => prev.filter((p) => p.name !== name))
  }

  function resetNotice() {
    setNEditingId(null)
    setNTitle('')
    setNBody('')
    setNPhotos([])
    setNError('')
  }

  function startEditNotice(n) {
    setNEditingId(n.id)
    setNTitle(n.title)
    setNBody(n.body || '')
    setNPhotos(eventImages(n).map((name) => ({ name, preview: thumbUrl(name) })))
    setNError('')
    noticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function pickNoticePhotos(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    setNError('')
    const added = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      setProgress(`${i + 1}/${files.length}`)
      try {
        const sized = await prepareImage(file)
        const name = await uploadImage(sized)
        added.push({ name, preview: `data:image/jpeg;base64,${sized.thumb}` })
      } catch (err) {
        setNError(err.message)
        break
      }
    }

    setProgress('')
    if (added.length > 0) setNPhotos((prev) => [...prev, ...added])
  }

  function submitNotice() {
    if (!nTitle.trim()) {
      setNError('공지 제목을 입력해 주세요.')
      return
    }

    const payload = {
      title: nTitle.trim(),
      body: nBody.trim(),
      postedAt: toKey(today()),
      updatedAt: Date.now(),
      ...(nPhotos.length > 0 ? { images: nPhotos.map((p) => p.name) } : {}),
    }

    if (nEditingId) {
      // 수정할 때는 처음 올린 날짜를 그대로 둔다
      const before = store.notices.find((n) => n.id === nEditingId)
      store.updateNotice(nEditingId, {
        ...payload,
        postedAt: before?.postedAt || payload.postedAt,
      })
      onToast('공지를 수정했어요')
    } else {
      store.addNotice({
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...payload,
      })
      onToast('공지를 올렸어요')
    }

    resetNotice()
  }

  function askDeleteNotice(id) {
    setNConfirmId(id)
    setTimeout(() => setNConfirmId((cur) => (cur === id ? null : cur)), 4000)
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError('일정 이름을 입력해 주세요.')
      return
    }
    if (!multi && !date) {
      setError('날짜를 선택해 주세요.')
      return
    }
    if (multi && sorted.length === 0) {
      setError('날짜를 하나 이상 골라 주세요.')
      return
    }

    // 고른 날짜들을 시작일 + 끝일 + 쉬는 날 형태로 바꿔 저장한다.
    // 화면 쪽 코드는 이 형태만 알면 되니까 단순하게 유지된다.
    let span = { date }
    if (multi) {
      const start = sorted[0]
      const end = sorted[sorted.length - 1]
      const gaps = datesBetween(start, end).filter((k) => !picked.includes(k))
      span = {
        date: start,
        ...(end > start ? { endDate: end } : {}),
        ...(gaps.length > 0 ? { excludeDates: gaps } : {}),
      }
    }

    const payload = {
      title: title.trim(),
      type,
      ...span,
      detail: detail.trim(),
      notifyBefore: [...notify].sort((a, b) => b - a),
      // 내용이 바뀌면 친구들 화면에 NEW가 다시 붙는다
      updatedAt: Date.now(),
      ...(photos.length > 0 ? { images: photos.map((p) => p.name) } : {}),
    }

    if (editingId) {
      store.updateEvent(editingId, payload)
      onToast('수정했어요')
    } else {
      store.addEvent({
        id: `${span.date}-${Math.random().toString(36).slice(2, 7)}`,
        ...payload,
      })
      onToast('일정을 추가했어요')
    }

    resetForm()
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(store.asJson())
      onToast('JSON을 복사했어요')
    } catch {
      window.prompt('아래 내용을 복사해서 events.json에 붙여넣으세요', store.asJson())
    }
  }

  async function publish() {
    setSaving(true)
    setSaveError('')
    try {
      await saveToGithub(store.asJson())
      store.markPublished()
      onToast('올렸어요. 1분 뒤 반영돼요')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const busy = progress !== ''

  return (
    <>
      {store.dirty && (
        <div className="dirty-bar">
          <span>아직 반에 반영되지 않았어요</span>
          <button
            className="btn tiny"
            disabled={!token || saving}
            onClick={publish}
          >
            {saving ? '올리는 중' : '지금 올리기'}
          </button>
        </div>
      )}

      <section ref={formRef}>
        <p className="section-label">{editingId ? '일정 수정' : '새 일정'}</p>
        <div className={`card${editingId ? ' editing' : ''}`}>
          <div className="field">
            <label htmlFor="title">이름</label>
            <input
              id="title"
              value={title}
              placeholder="예) 영어 수행평가"
              onChange={(e) => {
                setTitle(e.target.value)
                if (error) setError('')
              }}
            />
          </div>

          <div className="field">
            <label className="row-label">
              <span>여러 날 이어지는 일정</span>
              <input
                type="checkbox"
                checked={multi}
                onChange={(e) => toggleMulti(e.target.checked)}
              />
            </label>

            {multi ? (
              <>
                <DayMultiPicker
                  picked={picked}
                  onToggle={toggleDay}
                  color={typeStyle(type).hl}
                />
                <p className="pick-summary">
                  {sorted.length === 0
                    ? '날짜를 눌러서 골라 주세요'
                    : `${sorted.length}일 선택 · ${formatKorean(sorted[0])}${
                        sorted.length > 1
                          ? ` ~ ${formatKorean(sorted[sorted.length - 1])}`
                          : ''
                      }`}
                </p>
                <p className="hint">
                  시험이 있는 날만 눌러서 켜세요. 주말이나 공휴일처럼 쉬는 날은
                  그냥 두면 달력에서 비워집니다.
                </p>
              </>
            ) : (
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  if (error) setError('')
                }}
              />
            )}
          </div>

          <div className="field">
            <label>종류</label>
            <div className="chips">
              {TYPE_NAMES.map((t) => (
                <button
                  key={t}
                  className={`chip${type === t ? ' on' : ''}`}
                  style={type === t ? { background: typeStyle(t).hl } : undefined}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="detail">메모</label>
            <textarea
              id="detail"
              value={detail}
              placeholder={'준비물, 범위, 주의할 점\n줄을 바꿔서 여러 줄로 쓸 수 있어요'}
              rows={4}
              onChange={(e) => setDetail(e.target.value)}
            />
          </div>

          <div className="field">
            <label>사진 (여러 장 가능)</label>

            {photos.length > 0 && (
              <div className="photo-grid">
                {photos.map((p) => (
                  <div className="photo-item" key={p.name}>
                    <img src={p.preview} alt="첨부한 사진" />
                    <button
                      className="photo-x"
                      onClick={() => removePhoto(p.name)}
                      aria-label="이 사진 빼기"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className={`photo-drop${busy ? ' busy' : ''}`}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={pickPhotos}
                disabled={busy || !token}
              />
              {busy
                ? `올리는 중... ${progress}`
                : !token
                  ? '토큰을 먼저 등록해 주세요'
                  : photos.length > 0
                    ? '사진 더 고르기'
                    : '사진 고르기'}
            </label>
          </div>

          <div className="field">
            <label>며칠 전에 알릴까요</label>
            <div className="chips">
              {NOTIFY_OPTIONS.map((d) => (
                <button
                  key={d}
                  className={`chip${notify.includes(d) ? ' on' : ''}`}
                  style={notify.includes(d) ? { background: '#FFE86B' } : undefined}
                  onClick={() => toggleNotify(d)}
                >
                  {d}일 전
                </button>
              ))}
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn" disabled={busy} onClick={handleSubmit}>
            {editingId ? '수정 저장' : '일정 추가'}
          </button>

          {editingId && (
            <button className="btn ghost" style={{ marginTop: 9 }} onClick={resetForm}>
              취소
            </button>
          )}
        </div>
      </section>

      <section className="section">
        <p className="section-label">등록된 일정 {store.events.length}개</p>
        <div className="card">
          {store.events.length === 0 ? (
            <p className="empty-note" style={{ padding: '10px 0' }}>
              아직 없어요
            </p>
          ) : (
            sortByDate(store.events).map((e) => {
              const shots = eventImages(e).length
              return (
                <div className="manage-row" key={e.id}>
                  <span
                    className="dot"
                    style={{ background: typeStyle(e.type).hl, flex: 'none' }}
                  />
                  <button
                    className={`info${editingId === e.id ? ' on' : ''}`}
                    onClick={() => startEdit(e)}
                  >
                    <span className="n">{e.title}</span>
                    <span className="d">
                      {formatSpan(e)}
                      {shots > 0 && ` · 사진 ${shots}장`}
                    </span>
                  </button>
                  <button
                    className={`del${confirmId === e.id ? ' armed' : ''}`}
                    onClick={() => {
                      if (confirmId !== e.id) {
                        askDelete(e.id)
                        return
                      }
                      if (editingId === e.id) resetForm()
                      store.removeEvent(e.id)
                      setConfirmId(null)
                      onToast('삭제했어요')
                    }}
                  >
                    {confirmId === e.id ? '정말 삭제' : '삭제'}
                  </button>
                </div>
              )
            })
          )}

          {store.events.length > 0 && (
            <p className="hint">일정을 누르면 수정할 수 있어요.</p>
          )}

          {store.pastCount > 0 && (
            <button
              className="btn ghost"
              style={{ marginTop: 12 }}
              onClick={() => {
                store.removePast()
                onToast(`지난 일정 ${store.pastCount}개를 정리했어요`)
              }}
            >
              지난 일정 {store.pastCount}개 정리
            </button>
          )}
        </div>
      </section>

      <section className="section" ref={noticeRef}>
        <p className="section-label">{nEditingId ? '공지 수정' : '새 공지'}</p>
        <div className={`card${nEditingId ? ' editing' : ''}`}>
          <div className="field">
            <label htmlFor="ntitle">제목</label>
            <input
              id="ntitle"
              value={nTitle}
              placeholder="예) 수행 일정 변경 안내"
              onChange={(e) => {
                setNTitle(e.target.value)
                if (nError) setNError('')
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="nbody">내용</label>
            <textarea
              id="nbody"
              value={nBody}
              rows={5}
              placeholder={'자세한 내용을 적어 주세요\n줄을 바꿔서 여러 줄로 쓸 수 있어요'}
              onChange={(e) => setNBody(e.target.value)}
            />
          </div>

          <div className="field">
            <label>사진 (여러 장 가능)</label>

            {nPhotos.length > 0 && (
              <div className="photo-grid">
                {nPhotos.map((p) => (
                  <div className="photo-item" key={p.name}>
                    <img src={p.preview} alt="첨부한 사진" />
                    <button
                      className="photo-x"
                      onClick={() =>
                        setNPhotos((prev) => prev.filter((x) => x.name !== p.name))
                      }
                      aria-label="이 사진 빼기"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className={`photo-drop${busy ? ' busy' : ''}`}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={pickNoticePhotos}
                disabled={busy || !token}
              />
              {busy
                ? `올리는 중... ${progress}`
                : !token
                  ? '토큰을 먼저 등록해 주세요'
                  : nPhotos.length > 0
                    ? '사진 더 고르기'
                    : '사진 고르기'}
            </label>
          </div>

          {nError && <p className="error">{nError}</p>}

          <button className="btn" disabled={busy} onClick={submitNotice}>
            {nEditingId ? '수정 저장' : '공지 올리기'}
          </button>

          {nEditingId && (
            <button className="btn ghost" style={{ marginTop: 9 }} onClick={resetNotice}>
              취소
            </button>
          )}
        </div>
      </section>

      <section className="section">
        <p className="section-label">올린 공지 {store.notices.length}개</p>
        <div className="card">
          {store.notices.length === 0 ? (
            <p className="empty-note" style={{ padding: '10px 0' }}>
              아직 없어요
            </p>
          ) : (
            store.notices.map((n) => (
              <div className="manage-row" key={n.id}>
                <button
                  className={`info${nEditingId === n.id ? ' on' : ''}`}
                  onClick={() => startEditNotice(n)}
                >
                  <span className="n">{n.title}</span>
                  <span className="d">
                    {n.postedAt ? formatKorean(n.postedAt) : ''}
                    {eventImages(n).length > 0 && ` · 사진 ${eventImages(n).length}장`}
                  </span>
                </button>
                <button
                  className={`del${nConfirmId === n.id ? ' armed' : ''}`}
                  onClick={() => {
                    if (nConfirmId !== n.id) {
                      askDeleteNotice(n.id)
                      return
                    }
                    if (nEditingId === n.id) resetNotice()
                    store.removeNotice(n.id)
                    setNConfirmId(null)
                    onToast('삭제했어요')
                  }}
                >
                  {nConfirmId === n.id ? '정말 삭제' : '삭제'}
                </button>
              </div>
            ))
          )}

          {store.notices.length > 0 && (
            <p className="hint">공지를 누르면 수정할 수 있어요.</p>
          )}
        </div>
      </section>

      <section className="section">
        <p className="section-label">반 전체에 올리기</p>
        <div className="card stack">
          <div className="field" style={{ marginBottom: 4 }}>
            <label htmlFor="cname">반 이름</label>
            <input
              id="cname"
              value={store.className}
              onChange={(e) => store.setClassName(e.target.value)}
            />
          </div>

          {isConfigured() ? (
            <>
              <div className="field" style={{ marginBottom: 4 }}>
                <label htmlFor="token">GitHub 토큰</label>
                <input
                  id="token"
                  type="password"
                  value={token}
                  placeholder="github_pat_..."
                  autoComplete="off"
                  onChange={(e) => {
                    setTokenInput(e.target.value)
                    saveToken(e.target.value)
                    if (saveError) setSaveError('')
                  }}
                />
              </div>

              {saveError && <p className="error">{saveError}</p>}

              <button className="btn" disabled={!token || saving} onClick={publish}>
                {saving ? '올리는 중...' : 'GitHub에 올리기'}
              </button>

              {token && (
                <button
                  className="btn ghost"
                  onClick={() => {
                    clearToken()
                    setTokenInput('')
                    onToast('토큰을 지웠어요')
                  }}
                >
                  토큰 지우기
                </button>
              )}
            </>
          ) : (
            <p className="hint">
              config.js에 owner와 repo를 적으면 여기서 바로 GitHub에 올릴 수
              있어요. 그전까지는 아래 JSON 복사를 쓰면 됩니다.
            </p>
          )}

          <button className="btn ghost" onClick={copyJson}>
            JSON 복사
          </button>

          <button
            className="btn ghost"
            onClick={() => {
              store.resetToFile()
              resetForm()
              onToast('파일 내용으로 되돌렸어요')
            }}
          >
            events.json 내용으로 되돌리기
          </button>

          <p className="hint">
            올리기 전까지 수정한 내용은 이 기기에만 있어요. GitHub에 올려야
            친구들 화면에도 보입니다.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <button className="btn ghost" onClick={onLock}>
            편집 모드 끄기
          </button>
          <p className="hint">
            이 기기에서 편집 탭이 사라져요. 다시 켜려면 주소 뒤에
            <code> ?admin=열쇠</code>를 붙여 들어오면 됩니다.
          </p>
        </div>
      </section>
    </>
  )
}
