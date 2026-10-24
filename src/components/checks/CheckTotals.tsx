import { useMemo } from 'react'

import { checksOfDirection } from '../../services/checkDirection'
import { totalChecksInRange, totalUnpaidChecksInRange } from '../../services/checks'
import type { Check } from '../../types'
import {
  formatJalaliMonthLabel,
  getInstallmentDueRange,
  getJalaliMonthKey
} from '../../utils/dateRange'
import { getTodayIso } from '../../utils/jalaliDate'
import { distributionSparkline } from '../../utils/sparklineData'
import StatCard from '../StatCard'
import { dashboardStatGridClass } from '../ui/chartStyles'

/**
 * This month's checks and what is left until its end, each split into the checks I give
 * («پرداختی») and the ones I get («دریافتی»): one sum of both would mean nothing.
 */
export default function CheckTotals({ items }: { items: Check[] }) {
  const monthRange = useMemo(() => getInstallmentDueRange('month-to-date'), [])
  const monthLabel = useMemo(() => formatJalaliMonthLabel(getJalaliMonthKey(getTodayIso())), [])

  const parts = useMemo(
    () =>
      (['paid', 'received'] as const).map(direction => {
        const own = checksOfDirection(items, direction)

        return {
          direction,
          total: totalChecksInRange(own, monthRange),
          unpaid: totalUnpaidChecksInRange(own, monthRange),
          amounts: own.map(item => item.amount),
          unpaidAmounts: own.filter(item => !item.paid).map(item => item.amount)
        }
      }),
    [items, monthRange]
  )

  const [paid, received] = parts

  return (
    <div className={dashboardStatGridClass}>
      <StatCard
        label={`چک‌های پرداختی ${monthLabel}`}
        amount={paid.total}
        variant="expense"
        sparklineData={distributionSparkline(paid.amounts)}
        animateIndex={0}
        lift
      />
      <StatCard
        label={`چک‌های دریافتی ${monthLabel}`}
        amount={received.total}
        variant="income"
        sparklineData={distributionSparkline(received.amounts)}
        animateIndex={1}
        lift
      />
      <StatCard
        label="پرداختی‌های پاس‌نشده تا پایان ماه"
        amount={paid.unpaid}
        variant="expense"
        sparklineData={distributionSparkline(paid.unpaidAmounts)}
        animateIndex={2}
        lift
      />
      <StatCard
        label="دریافتی‌های پاس‌نشده تا پایان ماه"
        amount={received.unpaid}
        variant="income"
        sparklineData={distributionSparkline(received.unpaidAmounts)}
        animateIndex={3}
        lift
      />
    </div>
  )
}
