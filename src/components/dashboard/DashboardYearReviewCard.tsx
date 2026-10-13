import { lazy, Suspense, useState } from 'react'

import { getSettings } from '../../services/settings'
import { yearReviewDue } from '../../services/yearReviewGate'
import { getTodayIso } from '../../utils/jalaliDate'

// The card and its year aggregation load only inside the Nowruz window.
const YearReviewDashboardBody = lazy(() => import('../reports/years/YearReviewDashboardBody'))

/** «۱۴۰۵ در یک نگاه»: 25 Esfand–15 Farvardin, the dashboard's top card until ✕. */
export default function DashboardYearReviewCard() {
  const spreadsheetId = getSettings()?.spreadsheetId
  const [, rerender] = useState(0)
  const year = spreadsheetId ? yearReviewDue(spreadsheetId, getTodayIso()) : null

  if (!spreadsheetId || year == null) return null

  return (
    <Suspense fallback={null}>
      <YearReviewDashboardBody
        spreadsheetId={spreadsheetId}
        year={year}
        onDismiss={() => rerender(count => count + 1)}
      />
    </Suspense>
  )
}
