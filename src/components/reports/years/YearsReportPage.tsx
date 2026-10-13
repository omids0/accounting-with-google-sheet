import { useEffect, useState } from 'react'

import YearReviewCard from './YearReviewCard'
import { useDataRefresh } from '../../../hooks/useDataRefresh'
import { loadYearReviews } from '../../../services/reportsLoad'
import { getSettings, isConfigured } from '../../../services/settings'
import type { YearReview } from '../../../services/yearReview'
import { requireAuth } from '../../../utils/authGuard'
import { getTodayIso, isoToJalali } from '../../../utils/jalaliDate'
import { handleSheetError } from '../../../utils/sheetError'
import { DashboardSkeleton } from '../../skeleton'
import Card from '../../ui/Card'
import { emptyStateClass } from '../../ui/displayStyles'
import { periodReportEmptyClass, yearListClass } from '../../ui/periodReportStyles'
import { reportPageClass } from '../../ui/toolsPageStyles'

/** Reports › «سال‌ها»: every past year's «در یک نگاه» card, newest first. */
export default function YearsReportPage() {
  const revision = useDataRefresh()
  const [reviews, setReviews] = useState<YearReview[] | null>(null)

  useEffect(() => {
    const settings = getSettings()

    if (!settings || !isConfigured() || !requireAuth()) return

    let live = true

    loadYearReviews(settings)
      .then(next => live && setReviews(next))
      .catch(err => {
        if (live) setReviews([])
        handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری سال‌ها' })
      })

    return () => {
      live = false
    }
  }, [revision])

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  if (!reviews) return <DashboardSkeleton variant="report" />

  const currentYear = isoToJalali(getTodayIso()).year

  return (
    <div className={reportPageClass}>
      {reviews.length ? (
        <div className={yearListClass}>
          {reviews.map(review => (
            <YearReviewCard key={review.year} review={review} ended={review.year < currentYear} />
          ))}
        </div>
      ) : (
        <Card>
          <p className={periodReportEmptyClass}>
            هنوز سالی تمام نشده؛ کارت هر سال از ۲۵ اسفند اینجا می‌آید.
          </p>
        </Card>
      )}
    </div>
  )
}
