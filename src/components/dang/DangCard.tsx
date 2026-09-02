import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { AccordionCollapse } from '../AccordionCollapse'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
import CardInlineAmountEdit from '../CardInlineAmountEdit'
import type { DangWithRow } from './types'

export type DangCardProps = {
  item: DangWithRow
  expanded: boolean
  togglingId: string
  savingAmountId: string
  amountEdits: Record<string, number | ''>
  onTogglePaid: (item: DangWithRow, paid: boolean) => void
  onExpand: (id: string | null) => void
  onAmountChange: (item: DangWithRow, value: number | '') => void
  onAmountBlur: (item: DangWithRow) => void
  onEdit: (item: DangWithRow) => void
  onDelete: (item: DangWithRow) => void
}

export default function DangCard({
  item,
  expanded,
  togglingId,
  savingAmountId,
  amountEdits,
  onTogglePaid,
  onExpand,
  onAmountChange,
  onAmountBlur,
  onEdit,
  onDelete
}: DangCardProps) {
  const rawAmount = amountEdits[item.id] !== undefined ? amountEdits[item.id] : item.amount
  const displayAmount = rawAmount === '' ? item.amount : Number(rawAmount)

  return (
    <div
      className={`card dang-card interactive-card${item.paid ? ' paid' : ''}${
        expanded ? ' installment-card--expanded' : ''
      }`}
    >
      <input
        type="checkbox"
        className="dang-checkbox"
        checked={item.paid}
        disabled={togglingId === item.id}
        onChange={e => onTogglePaid(item, e.target.checked)}
      />
      <div className="dang-card-body">
        <button
          type="button"
          className={`dang-card-tap-area${expanded ? ' dang-card-tap-area--expanded' : ''}`}
          onClick={() => onExpand(expanded ? null : item.id)}
        >
          <div className="dang-card-header">
            <span className="dang-card-title">{item.title}</span>
            <span className="dang-card-amount" dir="ltr">
              {formatMoney(displayAmount)}
            </span>
          </div>
          <div className="dang-card-meta">
            {item.category && `${item.category} · `}
            طرف حساب: {item.counterparty}
            {item.date && (
              <span className="dang-card-date">· {formatIsoDatePersian(item.date)}</span>
            )}
          </div>
          {item.note && <p className="dang-card-note">{item.note}</p>}
          {item.paid && item.paidAt && <p className="dang-paid-at">در {item.paidAt} پرداخت شده</p>}
        </button>

        <AccordionCollapse open={expanded}>
          <div className="dang-card-amount-edit">
            <CardInlineAmountEdit
              label="مبلغ"
              value={amountEdits[item.id] !== undefined ? amountEdits[item.id] : item.amount}
              onChange={val => onAmountChange(item, val)}
              onBlur={() => onAmountBlur(item)}
              onClose={() => onExpand(null)}
              saving={savingAmountId === item.id}
            />
          </div>
        </AccordionCollapse>
      </div>
      <div className="card-action-buttons">
        <CardEditButton
          onClick={event => {
            event.stopPropagation()
            onEdit(item)
          }}
        />
        <CardDeleteButton
          onClick={event => {
            event.stopPropagation()
            onDelete(item)
          }}
        />
        <CardExpandButton
          expanded={expanded}
          onClick={event => {
            event.stopPropagation()
            onExpand(expanded ? null : item.id)
          }}
          ariaLabel={expanded ? 'بستن جزئیات' : 'ویرایش مبلغ بدهی'}
        />
      </div>
    </div>
  )
}
