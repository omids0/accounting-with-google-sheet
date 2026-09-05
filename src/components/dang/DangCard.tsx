import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { AccordionCollapse } from '../AccordionCollapse'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
import CardInlineAmountEdit from '../CardInlineAmountEdit'
import type { DangWithRow } from './types'
import {
  cardActionButtonsClass,
  dangCardAmountClass,
  dangCardAmountEditClass,
  dangCardBodyClass,
  dangCardClass,
  dangCardDateClass,
  dangCardHeaderClass,
  dangCardMetaClass,
  dangCardNoteClass,
  dangCardTapAreaClass,
  dangCardTitleClass,
  dangCheckboxClass,
  dangPaidAtClass
} from '../ui/featureCardStyles'

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
    <div className={dangCardClass({ paid: item.paid, expanded })}>
      <input
        type="checkbox"
        className={dangCheckboxClass}
        checked={item.paid}
        disabled={togglingId === item.id}
        onChange={e => onTogglePaid(item, e.target.checked)}
      />
      <div className={dangCardBodyClass}>
        <button
          type="button"
          className={dangCardTapAreaClass(expanded)}
          onClick={() => onExpand(expanded ? null : item.id)}
        >
          <div className={dangCardHeaderClass}>
            <span className={dangCardTitleClass}>{item.title}</span>
            <span className={dangCardAmountClass} dir="ltr">
              {formatMoney(displayAmount)}
            </span>
          </div>
          <div className={dangCardMetaClass}>
            {item.category && `${item.category} · `}
            طرف حساب: {item.counterparty}
            {item.date ? (
              <span className={dangCardDateClass}>· {formatIsoDatePersian(item.date)}</span>
            ) : null}
          </div>
          {item.note ? <p className={dangCardNoteClass}>{item.note}</p> : null}
          {item.paid && item.paidAt ? (
            <p className={dangPaidAtClass}>در {item.paidAt} پرداخت شده</p>
          ) : null}
        </button>

        <AccordionCollapse open={expanded}>
          <div className={dangCardAmountEditClass}>
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
      <div className={cardActionButtonsClass}>
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
