import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { CheckWithRow } from './types'

export type CheckCardProps = {
  item: CheckWithRow
  togglingId: string
  onTogglePaid: (item: CheckWithRow, paid: boolean) => void
  onEdit: (item: CheckWithRow) => void
  onDelete: (item: CheckWithRow) => void
}

export default function CheckCard({
  item,
  togglingId,
  onTogglePaid,
  onEdit,
  onDelete
}: CheckCardProps) {
  return (
    <div className={`card dang-card interactive-card${item.paid ? ' paid' : ''}`}>
      <input
        type="checkbox"
        className="dang-checkbox"
        checked={item.paid}
        disabled={togglingId === item.id}
        onChange={e => onTogglePaid(item, e.target.checked)}
      />
      <div className="dang-card-body">
        <div className="dang-card-header">
          <span className="dang-card-title">چک {item.checkNumber}</span>
          <span className="dang-card-amount" dir="ltr">
            {formatMoney(item.amount)}
          </span>
        </div>
        <div className="dang-card-meta">طرف حساب: {item.counterparty}</div>
        <div className="dang-card-meta">
          {item.creationDate && <span>صدور: {formatIsoDatePersian(item.creationDate)}</span>}
          {item.dueDate && (
            <span className="dang-card-date">· سررسید: {formatIsoDatePersian(item.dueDate)}</span>
          )}
        </div>
        {item.paid && item.paidAt && <p className="dang-paid-at">در {item.paidAt} پرداخت شده</p>}
      </div>
      <div className="card-action-buttons">
        <CardEditButton onClick={() => onEdit(item)} />
        <CardDeleteButton onClick={() => onDelete(item)} />
      </div>
    </div>
  )
}
