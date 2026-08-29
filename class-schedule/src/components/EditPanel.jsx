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
import { eventImages, imageUrl, shrinkToBase64 } from '../utils/image'

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
    setPhotos(eventImages(event).map((name) => ({ name, preview: imageUrl(name) })))
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
        const base64 = await shrinkToBase64(file)
        const name = await uploadImage(base64)
        added.push({ name, preview: `data:image/jpeg;base64,${base64}` })
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
                    className="del"
                    onClick={() => {
                      if (editingId === e.id) resetForm()
                      store.removeEvent(e.id)
                      onToast('삭제했어요')
                    }}
                  >
                    삭제
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
