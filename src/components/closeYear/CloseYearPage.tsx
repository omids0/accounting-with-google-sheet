import { Navigate, useParams } from 'react-router'

import CloseYearSteps from './CloseYearSteps'
import { useCloseYear } from './useCloseYear'
import { closeYearPath } from '../../routes/paths'
import { closeYearDefaultYear, isClosableYear } from '../../services/closeYear'
import { getTodayIso } from '../../utils/jalaliDate'
import { normalizeDigits } from '../../utils/normalizeDigits'
import { alertClassName } from '../ui/Alert'
import Card from '../ui/Card'
import { closeYearPageClass, closeYearPurposeClass } from '../ui/closeYearStyles'

function CloseYearWizard({ year }: { year: number }) {
  const wizard = useCloseYear(year)

  return (
    <div className={closeYearPageClass}>
      <p className={closeYearPurposeClass}>
        چهار قدم؛ هیچ‌چیز پاک نمی‌شود. هر قدم را می‌شود بعداً هم انجام داد.
      </p>
      <Card>
        <CloseYearSteps wizard={wizard} year={year} />
      </Card>
      <div className={alertClassName('warning')}>
        <b>بعدش چی؟ </b>
        داشبورد از ۱ فروردین با مانده‌های جدید شروع می‌کند. گزارش «سال در یک نگاه» همیشه در گزارش‌ها
        می‌ماند.
      </div>
    </div>
  )
}

/** `/settings/close-year/:year` — «بستن سال <year>» (round 7, Task E). */
export default function CloseYearPage() {
  const { year: param = '' } = useParams<{ year: string }>()
  const today = getTodayIso()
  const year = Number(normalizeDigits(param))

  if (!isClosableYear(year, today)) {
    return <Navigate to={closeYearPath(closeYearDefaultYear(today))} replace />
  }

  return <CloseYearWizard key={year} year={year} />
}
