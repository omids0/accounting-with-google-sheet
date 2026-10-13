import type { LineItemsAggregate, LineItemsReportType } from '../../../services/lineItemsReport'
import { formatMoney, formatPersianNumber } from '../../../utils/formatMoney'
import ReportTotalCard from '../ReportTotalCard'

const TYPE_LABEL: Record<LineItemsReportType, string> = {
  expense: 'هزینه',
  income: 'درآمد',
  all: 'تراکنش'
}

/** «هزینه با ریز اقلام · <period>»: the total, and how much of the period it covers. */
export default function LineItemsSummary({
  aggregate,
  type,
  periodLabel
}: {
  aggregate: LineItemsAggregate
  type: LineItemsReportType
  periodLabel: string
}) {
  const label = TYPE_LABEL[type]

  const all = aggregate.withItemsTotal + aggregate.withoutItemsTotal

  const share = all > 0 ? Math.round((aggregate.withItemsTotal / all) * 100) : 0

  return (
    <ReportTotalCard
      label={`${label} با ریز اقلام · ${periodLabel}`}
      amount={aggregate.withItemsTotal}
      tone={type === 'all' ? 'neutral' : type}
      caption={`${formatPersianNumber(share)}٪ ${label}‌ها · ${formatPersianNumber(
        aggregate.recordCount
      )} رکورد · ${formatPersianNumber(aggregate.itemCount)} قلم · ${formatMoney(
        aggregate.withoutItemsTotal
      )} بدون اقلام`}
    />
  )
}
