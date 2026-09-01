import { useEffect, useState } from 'react'
import { addDays, formatKorean, toKey, today } from '../utils/dateUtils'
import { ALLERGENS, fetchMeals } from '../utils/meal'
import DataSource from './DataSource'

const DAYS_AHEAD = 6 // 오늘부터 일주일치

function AllergyLine({ codes }) {
  if (codes.length === 0) return null
  const names = codes.map((c) => ALLERGENS[c]).filter(Boolean)
  if (names.length === 0) return null
  return <span className="meal-allergy">{names.join(', ')}</span>
}

/**
 * 급식 탭.
 * 오늘 급식을 크게 보여주고, 아래로 내리면 다음 날들이 이어진다.
 * 한 화면에 일주일을 다 넣으면 정작 오늘 뭐 나오는지가 안 보인다.
 */
export default function MealView() {
  const todayKey = toKey(today())
  const [meals, setMeals] = useState(null)
  const [error, setError] = useState('')
  const [openAllergy, setOpenAllergy] = useState(false)

  useEffect(() => {
    let alive = true

    fetchMeals(todayKey, addDays(todayKey, DAYS_AHEAD))
      .then((data) => {
        if (alive) setMeals(data)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })

    return () => {
      alive = false
    }
  }, [todayKey])

  if (error) return <p className="empty-note">{error}</p>
  if (meals === null) return <p className="empty-note">불러오는 중...</p>

  const todayMeal = meals[todayKey]

  // 오늘 다음으로 급식이 있는 날들
  const upcoming = Array.from({ length: DAYS_AHEAD }, (_, i) =>
    addDays(todayKey, i + 1)
  ).filter((d) => meals[d])

  return (
    <>
      <div className="card meal-today">
        <p className="eyebrow">오늘 급식</p>

        {todayMeal ? (
          <>
            <ul className="meal-list">
              {todayMeal.dishes.map((d, i) => (
                <li key={i}>
                  {d.name}
                  {openAllergy && <AllergyLine codes={d.codes} />}
                </li>
              ))}
            </ul>

            <div className="meal-foot">
              {todayMeal.kcal && <span className="meal-kcal">{todayMeal.kcal} kcal</span>}
              <button
                className="btn ghost tiny"
                onClick={() => setOpenAllergy((v) => !v)}
              >
                {openAllergy ? '알레르기 숨기기' : '알레르기 보기'}
              </button>
            </div>
          </>
        ) : (
          <p className="meal-none">오늘은 급식이 없어요</p>
        )}
      </div>

      {upcoming.length > 0 && (
        <section className="section">
          <p className="section-label">다음 급식</p>
          {upcoming.map((d) => (
            <div className="card meal-next" key={d}>
              <p className="meal-date">{formatKorean(d)}</p>
              <p className="meal-line">
                {meals[d].dishes.map((x) => x.name).join(' · ')}
              </p>
            </div>
          ))}
        </section>
      )}

      <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
        학교에서 올린 식단을 그대로 보여줘요.
      </p>
      <DataSource />
    </>
  )
}
