import { useCallback, useEffect, useState } from 'react'
import defaultData from '../data/events.json'
import { dday } from './dateUtils'
import { KEEP_PAST_DAYS } from '../config'

const STORAGE_KEY = 'class-schedule:v1'

/**
 * 일정 데이터를 다룬다.
 *
 * 모두가 보는 진짜 데이터는 항상 src/data/events.json 이다.
 * 관리자만 이 기기에 편집 중인 초안을 임시로 저장해두고, GitHub에 올리는 순간
 * 그게 모두의 데이터가 된다. 다른 사람 기기에는 초안이 아예 생기지 않는다.
 */
export function useEvents(isAdmin) {
  const [data, setData] = useState(defaultData)

  // 관리자로 확인되면, 저장해둔 편집 초안이 있는지 찾아본다
  useEffect(() => {
    if (!isAdmin) {
      setData(defaultData)
      return
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed?.events)) setData(parsed)
      }
    } catch {
      // 저장된 값이 깨졌으면 파일 내용 그대로 간다
    }
  }, [isAdmin])

  // 관리자가 편집할 때만 초안을 남긴다
  useEffect(() => {
    if (!isAdmin) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // 시크릿 모드 등 저장이 막힌 환경 — 화면은 그대로 동작한다
    }
  }, [data, isAdmin])

  const addEvent = useCallback((event) => {
    setData((prev) => ({ ...prev, events: [...prev.events, event] }))
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
      events: prev.events.filter((e) => dday(e.date) >= -KEEP_PAST_DAYS),
    }))
  }, [])

  const setClassName = useCallback((className) => {
    setData((prev) => ({ ...prev, className }))
  }, [])

  const resetToFile = useCallback(() => {
    setData(defaultData)
  }, [])

  // 화면에 보여줄 일정. 지난 건 알아서 빠진다.
  const visible = data.events.filter((e) => dday(e.date) >= -KEEP_PAST_DAYS)
  const pastCount = data.events.length - visible.length

  return {
    className: data.className || '우리 반',
    events: data.events, // 편집 탭에서 쓰는 전체 목록
    visible, // 홈, 달력에서 쓰는 목록
    pastCount,
    addEvent,
    removeEvent,
    removePast,
    setClassName,
    resetToFile,
    asJson: () => JSON.stringify(data, null, 2),
  }
}
