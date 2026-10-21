import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { AccordionCollapse } from '../AccordionCollapse'
import AmountField from '../AmountField'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
import CardInlineAmountEdit from '../CardInlineAmountEdit'
import DangSettleAction from './DangSettleAction'
import type { DangWithRow } from './types'
import MoneyText from '../MoneyText'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  dangCardAmountClass,
  dangCardAmountEditClass,
  dangCardBodyClass,
  dangCardClass,
  dangCardContentRowClass,
  dangCardDateClass,
  dangCardHeaderClass,
  dangCardMetaClass,
  dangCardNoteClass,
  dangCardTapAreaClass,
  dangCardTitleClass,
  dangCheckboxClass,
  dangPaidAtClass
} from '../ui/featureCardStyles'
import { useReadOnly } from '../ui/readOnly'
import WriterAvatar from '../WriterAvatar'

export type DangCardProps = {
  item: DangWithRow
  expanded: boolean
  togglingId: string
  savingAmountId: string
  amountEdits: Record<string, number | ''>
  onTogglePaid: (item: DangWithRow, paid: boolean) => void
  onExpand: (id: string | null) => void
  onAmountChange: (item: DangWithRow, value: number | '') => void
  /** `value` is passed by the dial pad, which has the new amount in hand already. */
  onAmountBlur: (item: DangWithRow, value?: number | '') => void
  onEdit: (item: DangWithRow) => void
  onDelete: (item: DangWithRow) => void
  /**
   * A building's debt: settled with the button «پرداخت به …» instead of the small checkbox, and
   * the amount is typed on the dial pad.
   */
  building?: boolean
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
  onDelete,
  building = false
}: DangCardProps) {
  const readOnly = useReadOnly()
  const rawAmount = amountEdits[item.id] !== undefined ? amountEdits[item.id] : item.amount
  const displayAmount = rawAmount === '' ? item.amount : Number(rawAmount)

  return (
    <div
      className={dangCardClass({ paid: item.paid, expanded: expanded && !readOnly })}
      data-highlight-id={item.id}
    >
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          {building ? null : (
            <input
              type="checkbox"
              className={dangCheckboxClass}
              checked={item.paid}
              disabled={togglingId === item.id || readOnly}
              aria-label={`پرداخت شد: ${item.title}`}
              onChange={e => onTogglePaid(item, e.target.checked)}
            />
          )}
          <div className={dangCardBodyClass}>
            <button
              type="button"
              className={dangCardTapAreaClass(expanded)}
              onClick={() => onExpand(expanded ? null : item.id)}
            >
              <div className={dangCardHeaderClass}>
                <span className={dangCardTitleClass}>{item.title}</span>
                <span className={dangCardAmountClass}>
                  <MoneyText amount={displayAmount} />
                </span>
              </div>
              <div className={dangCardMetaClass}>
                <WriterAvatar email={item.writer} withName />
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

            {building && !readOnly ? (
              <DangSettleAction item={item} busy={togglingId === item.id} onToggle={onTogglePaid} />
            ) : null}

            <AccordionCollapse open={expanded && !readOnly}>
              <div className={dangCardAmountEditClass}>
                {building ? (
                  <AmountField
                    label="مبلغ بدهی"
                    value={item.amount}
                    onChange={value => {
                      onAmountChange(item, value)
                      onAmountBlur(item, value)
                      onExpand(null)
                    }}
                  />
                ) : (
                  <CardInlineAmountEdit
                    label="مبلغ"
                    value={amountEdits[item.id] !== undefined ? amountEdits[item.id] : item.amount}
                    onChange={val => onAmountChange(item, val)}
                    onBlur={() => onAmountBlur(item)}
                    onClose={() => onExpand(null)}
                    saving={savingAmountId === item.id}
                  />
                )}
              </div>
            </AccordionCollapse>
          </div>
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
          {readOnly ? null : (
            <CardExpandButton
              expanded={expanded}
              onClick={event => {
                event.stopPropagation()
                onExpand(expanded ? null : item.id)
              }}
              ariaLabel={expanded ? 'بستن جزئیات' : 'ویرایش مبلغ بدهی'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
