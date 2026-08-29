import { useState } from 'react'
import { formatKorean, sortByDate, toKey, today } from '../utils/dateUtils'
import { TYPE_NAMES, typeStyle } from '../utils/eventTypes'
import {
  clearToken,
  getToken,
  isConfigured,
  saveToGithub,
  saveToken,
  uploadImage,
} from '../utils/github'
import { shrinkToBase64 } from '../utils/image'

const NOTIFY_OPTIONS = [14, 7, 3, 1]

export default function EditPanel({ store, onToast, onLock }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toKey(today()))
  const [type, setType] = useState('수행평가')
  const [detail, setDetail] = useState('')
  const [notify, setNotify] = useState([7, 3, 1])
  const [error, setError] = useState('')

  const [image, setImage] = useState(null) // { name, preview }
  const [uploading, setUploading] = useState(false)

  const [token, setTokenInput] = useState(getToken())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  function toggleNotify(day) {
    setNotify((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  async function pickImage(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일을 다시 골라도 동작하게
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('사진 파일만 올릴 수 있어요.')
      return
    }

    setUploading(true)
    setError('')
    try {
      // 크기를 줄여서 올리고, 일정에는 파일 이름만 저장한다
      const base64 = await shrinkToBase64(file)
      const name = await uploadImage(base64)
      setImage({ name, preview: `data:image/jpeg;base64,${base64}` })
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleAdd() {
    if (!title.trim()) {
      setError('일정 이름을 입력해 주세요.')
      return
    }
    if (!date) {
      setError('날짜를 선택해 주세요.')
      return
    }

    store.addEvent({
      id: `${date}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      type,
      date,
      detail: detail.trim(),
      notifyBefore: [...notify].sort((a, b) => b - a),
      ...(image ? { image: image.name } : {}),
    })

    setTitle('')
    setDetail('')
    setImage(null)
    setError('')
    onToast('일정을 추가했어요')
  }

  async function copyJson() {
    const text = store.asJson()
    try {
      await navigator.clipboard.writeText(text)
      onToast('JSON을 복사했어요')
    } catch {
      window.prompt('아래 내용을 복사해서 events.json에 붙여넣으세요', text)
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

  return (
    <>
      <section>
        <p className="section-label">새 일정</p>
        <div className="card">
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
            <label htmlFor="date">날짜</label>
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
            <label>사진 (선택)</label>
            {image ? (
              <div className="photo-pick">
                <img src={image.preview} alt="첨부한 사진 미리보기" />
                <button className="btn ghost tiny" onClick={() => setImage(null)}>
                  사진 빼기
                </button>
              </div>
            ) : (
              <label className={`photo-drop${uploading ? ' busy' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={pickImage}
                  disabled={uploading || !getToken()}
                />
                {uploading
                  ? '올리는 중...'
                  : getToken()
                    ? '사진 고르기'
                    : '토큰을 먼저 등록해 주세요'}
              </label>
            )}
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

          <button className="btn" disabled={uploading} onClick={handleAdd}>
            일정 추가
          </button>
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
            sortByDate(store.events).map((e) => (
              <div className="manage-row" key={e.id}>
                <span
                  className="dot"
                  style={{ background: typeStyle(e.type).hl, flex: 'none' }}
                />
                <span className="info">
                  <span className="n">{e.title}</span>
                  <span className="d">
                    {formatKorean(e.date)}
                    {e.image && ' · 사진'}
                  </span>
                </span>
                <button
                  className="del"
                  onClick={() => {
                    store.removeEvent(e.id)
                    onToast('삭제했어요')
                  }}
                >
                  삭제
                </button>
              </div>
            ))
          )}

          {store.pastCount > 0 && (
            <button
              className="btn ghost"
              style={{ marginTop: 14 }}
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
