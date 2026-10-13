import { Fragment } from 'react'

import type { NetWorthTrend } from '../../services/netWorthTrend'
import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import MaskedAmount from '../MaskedAmount'
import MoneyDisplay from '../MoneyDisplay'
import Card from '../ui/Card'
import { dashboardHeroCardClass, dashboardHeroLabelClass } from '../ui/chartStyles'
import { dashboardHeroCompareClass } from '../ui/dashboardCalmStyles'

/** «↑ ۴٬۲۰۰٬۰۰۰ از ابتدای سال · ↓ ۸۰۰٬۰۰۰ از ماه قبل»; a part without history is left out. */
function changeParts(trend: NetWorthTrend): { key: string; value: number; tail: string }[] {
  return [
    { key: 'year', value: trend.sinceYearStart, tail: 'از ابتدای سال' },
    { key: 'month', value: trend.sincePrevMonth, tail: 'از ماه قبل' }
  ].flatMap(part => (part.value == null ? [] : [{ ...part, value: part.value }]))
}

/** «دارایی قابل اتکا · امروز» with its change since the start of the year and last month. */
export default function NetWorthHero({ trend }: { trend: NetWorthTrend }) {
  const parts = changeParts(trend)

  return (
    <Card className={cn(dashboardHeroCardClass)}>
      <div className={dashboardHeroLabelClass}>دارایی قابل اتکا · امروز</div>
      <MoneyDisplay amount={trend.today.netWorth} size="hero" tone="hero" />
      {parts.length ? (
        <p className={dashboardHeroCompareClass}>
          {parts.map((part, index) => (
            <Fragment key={part.key}>
              {index > 0 ? ' · ' : null}
              <span aria-hidden="true">{part.value < 0 ? '↓' : '↑'} </span>
              <span className="sr-only">{part.value < 0 ? 'کاهش' : 'افزایش'} </span>
              <MaskedAmount>{formatPersianNumber(Math.abs(part.value))}</MaskedAmount>
              {` ${part.tail}`}
            </Fragment>
          ))}
        </p>
      ) : null}
    </Card>
  )
}
