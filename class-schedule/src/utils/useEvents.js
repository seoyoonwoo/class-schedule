import { useCallback, useEffect, useState } from 'react'
import { dday, endDateOf } from './dateUtils'
import { KEEP_PAST_DAYS } from '../config'

const STORAGE_KEY = 'class-schedule:v1'

// 일정 파일은 빌드에 섞지 않고 앱을 열 때마다 새로 받아온다.
// 그래야 GitHub에 올린 내용이 홈 화면 앱에도 바로 반영된다.
const DATA_URL = `${import.meta.env.BASE_URL}events.json`

export function useEvents(isAdmin) {
  const [fileData, setFileData] = useState(null) // 서버에 있는 진짜 데이터
  const [data, setData] = useState(null) // 화면에 쓰는 데이터 (관리자는 편집 초안)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  /** 서버에서 일정 파일을 다시 받아온다 */
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      setFileData(await res.json())
      setError('')
    } catch {
      setError('일정을 불러오지 못했어요. 아래로 당겨서 다시 시도해 주세요.')
    }
  }, [])

  // 앱을 열 때마다 최신 파일을 받아온다
  useEffect(() => {
    load()
  }, [load])

  /** 화면을 아래로 당겼을 때 */
  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    // 너무 빨리 끝나면 새로고침이 된 건지 알 수 없어서 잠깐 붙잡아 둔다
    await new Promise((r) => setTimeout(r, 450))
    setRefreshing(false)
  }, [load])

  // 파일이 도착했거나 편집 권한이 바뀌면 화면에 쓸 데이터를 정한다
  useEffect(() => {
    if (!fileData) return

    if (!isAdmin) {
      setData(fileData)
      return
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed?.events)) {
          setData(parsed)
          return
        }
      }
    } catch {
      // 저장된 초안이 깨졌으면 파일 내용으로 간다
    }

    setData(fileData)
  }, [fileData, isAdmin])

  // 관리자가 편집할 때만 초안을 남긴다
  useEffect(() => {
    if (!isAdmin || !data) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // 시크릿 모드 등 저장이 막힌 환경 — 화면은 그대로 동작한다
    }
  }, [data, isAdmin])

  const addEvent = useCallback((event) => {
    setData((prev) => ({ ...prev, events: [...prev.events, event] }))
  }, [])

  /** 기존 일정을 통째로 바꾼다. id는 그대로 유지. */
  const updateEvent = useCallback((id, next) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === id ? { ...next, id } : e)),
    }))
  }, [])

  const removeEvent = useCallback((id) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== id),
    }))
  }, [])

  /** 날짜가 지난 일정을 데이터에서 아예 지운다 */
  const removePast = useCallback(() => {
    setData((prev) => ({
      ...prev,
      events: prev.events.filter((e) => dday(endDateOf(e)) >= -KEEP_PAST_DAYS),
    }))
  }, [])

  const setClassName = useCallback((className) => {
    setData((prev) => ({ ...prev, className }))
  }, [])

  const resetToFile = useCallback(() => {
    if (fileData) setData(fileData)
  }, [fileData])

  // 편집한 내용이 아직 반에 올라가지 않았는지.
  // 초안은 이 기기에 저장돼 있어서 사라지지는 않지만,
  // 올리기 전까지는 친구들 화면에 보이지 않는다.
  const dirty =
    Boolean(isAdmin && data && fileData) &&
    JSON.stringify(data) !== JSON.stringify(fileData)

  /** GitHub에 올린 직후 호출. 이제 파일과 초안이 같아진다. */
  const markPublished = useCallback(() => {
    setFileData(data)
  }, [data])

  const events = data?.events || []
  const visible = events.filter((e) => dday(endDateOf(e)) >= -KEEP_PAST_DAYS)

  return {
    loading: !data && !error,
    error,
    refreshing,
    refresh,
    className: data?.className || '우리 반',
    events,
    visible,
    pastCount: events.length - visible.length,
    dirty,
    markPublished,
    addEvent,
    updateEvent,
    removeEvent,
    removePast,
    setClassName,
    resetToFile,
    asJson: () => JSON.stringify(data, null, 2),
  }
}
