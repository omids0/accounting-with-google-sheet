import { useEffect, useState } from 'react'

import YearReviewCard from './YearReviewCard'
import { useDataRefresh } from '../../../hooks/useDataRefresh'
import { loadYearReviews } from '../../../services/reportsLoad'
import { getSettings } from '../../../services/settings'
import type { YearReview } from '../../../services/yearReview'
import { dismissYearReview } from '../../../services/yearReviewGate'
import { getTodayIso, isoToJalali } from '../../../utils/jalaliDate'

/** The dashboard's «در یک نگاه» card, loaded only inside the 25 Esfand–15 Farvardin window. */
export default function YearReviewDashboardBody({
  spreadsheetId,
  year,
  onDismiss
}: {
  spreadsheetId: string
  year: number
  onDismiss: () => void
}) {
  const revision = useDataRefresh()
  const [review, setReview] = useState<YearReview | null>(null)

  useEffect(() => {
    const settings = getSettings()

    if (settings?.spreadsheetId !== spreadsheetId) return

    let live = true

    loadYearReviews(settings, [year])
      .then(([next]) => live && setReview(next ?? null))
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [spreadsheetId, year, revision])

  if (!review) return null

  return (
    <YearReviewCard
      review={review}
      ended={isoToJalali(getTodayIso()).year > year}
      onDismiss={() => {
        dismissYearReview(spreadsheetId, year)
        onDismiss()
      }}
    />
  )
}
