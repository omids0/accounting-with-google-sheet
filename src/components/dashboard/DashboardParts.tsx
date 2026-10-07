import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import MoneyDisplay from '../MoneyDisplay'
import {
  assetExcludedTagClass,
  assetLabelClass,
  assetLabelLinkClass,
  assetRowClass,
  assetRowExcludedClass,
  assetRowTotalClass,
  assetValueClass
} from '../ui/chartStyles'

export function RecordAmount({ amount, type }: { amount: number; type: 'income' | 'expense' }) {
  const signedAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount)

  return (
    <MoneyDisplay
      amount={signedAmount}
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
  excluded,
  onNavigate
}: {
  label: string
  value: number
  total?: boolean
  /** Not counted in the total (per «دارایی قابل اتکا» settings). */
  excluded?: boolean
  onNavigate?: () => void
}) {
  const tag = excluded ? <span className={assetExcludedTagClass}>(لحاظ نشده)</span> : null

  return (
    <div
      className={cn(assetRowClass, total && assetRowTotalClass, excluded && assetRowExcludedClass)}
    >
      {onNavigate ? (
        <button
          type="button"
          className={cn(assetLabelClass, assetLabelLinkClass)}
          onClick={onNavigate}
        >
          {label}
          {tag}
        </button>
      ) : (
        <span className={assetLabelClass}>
          {label}
          {tag}
        </span>
      )}
      <span className={assetValueClass}>{formatMoney(value)}</span>
    </div>
  )
}
