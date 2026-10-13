import { useNavigate } from 'react-router'

import { closeYearPath } from '../../routes/paths'
import { closeYearDefaultYear } from '../../services/closeYear'
import { formatJalaliYear } from '../../utils/dateRange'
import { getTodayIso } from '../../utils/jalaliDate'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'
import { formHintClass } from '../ui/formStyles'

/** Settings → «حساب و داده» → «بستن سال»: the year that just ended, or the ending one from 25 Esfand. */
export default function SettingsCloseYearCard() {
  const navigate = useNavigate()
  const year = closeYearDefaultYear(getTodayIso())

  return (
    <Card>
      <CardTitle>بستن سال</CardTitle>
      <p className={formHintClass}>
        تطبیق حساب‌ها، مانده‌های اول سال بعد، آرشیو رکوردهای سال و یک پشتیبان کامل؛ هیچ‌چیز پاک
        نمی‌شود.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => navigate(closeYearPath(year))}
      >
        {`بستن سال ${formatJalaliYear(year)}`}
      </Button>
    </Card>
  )
}
