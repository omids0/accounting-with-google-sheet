import { formatMoney } from '../../utils/formatMoney'
import MoneyDisplay from '../MoneyDisplay'

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
    <div className={`asset-row${total ? ' asset-row-total' : ''}`}>
      {onNavigate ? (
        <button type="button" className="asset-label asset-label-link" onClick={onNavigate}>
          {label}
        </button>
      ) : (
        <span className="asset-label">{label}</span>
      )}
      <span className="asset-value" dir="ltr">
        {formatMoney(value)}
      </span>
    </div>
  )
}
