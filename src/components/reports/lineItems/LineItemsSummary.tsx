import type { LineItemsAggregate, LineItemsReportType } from '../../../services/lineItemsReport'
import { cn } from '../../../utils/cn'
import { formatMoney, formatPersianNumber } from '../../../utils/formatMoney'
import MoneyText from '../../MoneyText'
import Card from '../../ui/Card'

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
    <Card>
      <p className="m-0 text-[0.8rem] font-semibold text-muted">{`${label} با ریز اقلام · ${periodLabel}`}</p>
      <p
        className={cn(
          'm-0 mt-1 text-[1.5rem] font-bold',
          type === 'income' ? 'text-success' : type === 'expense' ? 'text-danger' : 'text-text'
        )}
      >
        <MoneyText amount={aggregate.withItemsTotal} />
      </p>
      <p className="m-0 mt-1.5 text-[0.78rem] leading-[1.6] text-muted">
        {`${formatPersianNumber(share)}٪ ${label}‌ها · ${formatPersianNumber(
          aggregate.recordCount
        )} رکورد · ${formatPersianNumber(aggregate.itemCount)} قلم · ${formatMoney(
          aggregate.withoutItemsTotal
        )} بدون اقلام`}
      </p>
    </Card>
  )
}
