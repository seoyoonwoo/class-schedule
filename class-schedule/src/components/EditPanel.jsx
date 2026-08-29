import { useRef, useState } from 'react'
import {
  datesBetween,
  dayOf,
  formatSpan,
  isWeekend,
  sortByDate,
  toKey,
  today,
  weekdayOf,
} from '../utils/dateUtils'
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
  const [endDate, setEndDate] = useState('')
  const [excluded, setExcluded] = useState([]) // 기간 안에서 안 하는 날
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
    setEndDate('')
    setExcluded([])
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
    setEndDate(event.endDate && event.endDate > event.date ? event.endDate : '')
    setExcluded(event.excludeDates || [])
    setType(event.type)
    setDetail(event.detail || '')
    setNotify(event.notifyBefore || [])
    setPhotos(eventImages(event).map((name) => ({ name, preview: imageUrl(name) })))
    setError('')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // 시작일~끝일 사이의 모든 날짜. 끝일이 없으면 빈 배열.
  const rangeDays =
    endDate !== '' && endDate > date ? datesBetween(date, endDate) : []

  function toggleDay(key) {
    setExcluded((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
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
    if (!date) {
      setError('날짜를 선택해 주세요.')
      return
    }
    if (endDate !== '' && endDate < date) {
      setError('끝나는 날이 시작일보다 빨라요.')
      return
    }
    if (rangeDays.length > 0 && rangeDays.every((k) => excluded.includes(k))) {
      setError('적어도 하루는 켜 두어야 해요.')
      return
    }

    const payload = {
      title: title.trim(),
      type,
      date,
      detail: detail.trim(),
      notifyBefore: [...notify].sort((a, b) => b - a),
      ...(endDate !== '' && endDate > date ? { endDate } : {}),
      ...(rangeDays.length > 0 && excluded.length > 0
        ? { excludeDates: excluded.filter((k) => rangeDays.includes(k)).sort() }
        : {}),
      ...(photos.length > 0 ? { images: photos.map((p) => p.name) } : {}),
    }

    if (editingId) {
      store.updateEvent(editingId, payload)
      onToast('수정했어요')
    } else {
      store.addEvent({
        id: `${date}-${Math.random().toString(36).slice(2, 7)}`,
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
            <label htmlFor="date">{endDate !== '' ? '시작일' : '날짜'}</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                if (error) setError('')
              }}
            />
          </div>

          <div className="field">
            <label className="row-label">
              <span>여러 날 이어지는 일정</span>
              <input
                type="checkbox"
                checked={endDate !== ''}
                onChange={(e) => setEndDate(e.target.checked ? date : '')}
              />
            </label>
            {endDate !== '' && (
              <input
                type="date"
                value={endDate}
                min={date}
                onChange={(e) => {
                  const v = e.target.value
                  setEndDate(v)
                  // 주말은 보통 안 하니까 미리 꺼둔다. 눌러서 다시 켤 수 있다.
                  if (v && v > date) setExcluded(datesBetween(date, v).filter(isWeekend))
                  if (error) setError('')
                }}
              />
            )}
            {rangeDays.length > 1 && (
              <>
                <p className="pick-label">실제로 하는 날만 켜 두세요</p>

                {rangeDays.length <= 45 ? (
                  <div className="day-picker">
                    {rangeDays.map((key) => {
                      const on = !excluded.includes(key)
                      return (
                        <button
                          key={key}
                          className={`day-chip${on ? ' on' : ''}`}
                          style={on ? { background: typeStyle(type).hl } : undefined}
                          onClick={() => toggleDay(key)}
                          aria-pressed={on}
                        >
                          <span className="dnum">{dayOf(key)}</span>
                          <span className="dwd">{weekdayOf(key)}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="hint">
                    기간이 너무 길어서 날짜를 하나씩 고를 수 없어요. 전부 하는
                    걸로 처리됩니다.
                  </p>
                )}

                <p className="hint">
                  주말은 미리 꺼 뒀어요. 공휴일이나 시험이 없는 날도 눌러서 끄면
                  달력에서 그 날만 비워집니다.
                </p>
              </>
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
              placeholder="준비물, 범위, 주의할 점"
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
