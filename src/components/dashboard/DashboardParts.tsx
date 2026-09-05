import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import MoneyDisplay from '../MoneyDisplay'
import {
  assetLabelClass,
  assetLabelLinkClass,
  assetRowClass,
  assetRowTotalClass,
  assetValueClass
} from '../ui/chartStyles'

export function RecordAmount({ amount, type }: { amount: number; type: 'income' | 'expense' }) {
  return (
    <MoneyDisplay
      amount={amount}
      size="record"
      tone={type === 'income' ? 'income' : 'expense'}
      signed
    />
  )
}

export function BreakdownRow({
  label,
  value,
  total,
  onNavigate
}: {
  label: string
  value: number
  total?: boolean
  onNavigate?: () => void
}) {
  return (
    <div className={cn(assetRowClass, total && assetRowTotalClass)}>
      {onNavigate ? (
        <button
          type="button"
          className={cn(assetLabelClass, assetLabelLinkClass)}
          onClick={onNavigate}
        >
          {label}
        </button>
      ) : (
        <span className={assetLabelClass}>{label}</span>
      )}
      <span className={assetValueClass} dir="ltr">
        {formatMoney(value)}
      </span>
    </div>
  )
}
