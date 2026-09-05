import { formatMoney } from '../../utils/formatMoney'
import {
  chartTooltipClass,
  chartTooltipDotClass,
  chartTooltipLabelClass,
  chartTooltipNameClass,
  chartTooltipRowClass,
  chartTooltipRowsClass,
  chartTooltipValueClass
} from '../ui/chartStyles'

type ChartTooltipEntry = {
  name?: string | number
  dataKey?: string | number
  value?: number | string
}

type ChartTooltipProps = {
  active?: boolean
  payload?: ChartTooltipEntry[]
  label?: string | number
}

export default function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className={chartTooltipClass} role="tooltip">
      {label ? <div className={chartTooltipLabelClass}>{label}</div> : null}
      <div className={chartTooltipRowsClass}>
        {payload.map(entry => {
          const name = String(entry.name ?? '')

          const displayName =
            name === 'income'
              ? 'درآمد'
              : name === 'expense'
              ? 'هزینه'
              : name === 'total' || name === 'مجموع'
              ? 'مجموع'
              : name

          const tone = name === 'income' ? 'income' : name === 'expense' ? 'expense' : 'neutral'

          return (
            <div key={`${name}-${String(entry.dataKey)}`} className={chartTooltipRowClass}>
              <span className={chartTooltipDotClass(tone)} />
              <span className={chartTooltipNameClass}>{displayName}</span>
              <span className={chartTooltipValueClass} dir="ltr">
                {formatMoney(Number(entry.value) || 0)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
