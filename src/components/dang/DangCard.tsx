import { dangAmountFloor } from './amountFloor'
import DangSettleAction from './DangSettleAction'
import { dangMinAmountHint } from './paymentLabels'
import type { DangAmountEditApi, DangWithRow } from './types'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { formatPaidStamp } from '../../utils/paidStamp'
import { AccordionCollapse } from '../AccordionCollapse'
import AmountField from '../AmountField'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
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
  dangPaidAtClass
} from '../ui/featureCardStyles'
import { formHintClass } from '../ui/formStyles'
import { useReadOnly } from '../ui/readOnly'
import WriterAvatar from '../WriterAvatar'

export type DangCardProps = {
  item: DangWithRow
  expanded: boolean
  togglingId: string
  amountEdit: DangAmountEditApi
  onTogglePaid: (item: DangWithRow, paid: boolean) => void
  onExpand: (id: string | null) => void
  onEdit: (item: DangWithRow) => void
  onDelete: (item: DangWithRow) => void
}

/**
 * A building's debt: settled with the button «پرداخت به …», and the amount is typed on the dial
 * pad. (A personal debt is paid in pieces and uses `DangPaymentCard`.)
 */
export default function DangCard({
  item,
  expanded,
  togglingId,
  amountEdit,
  onTogglePaid,
  onExpand,
  onEdit,
  onDelete
}: DangCardProps) {
  const readOnly = useReadOnly()

  const { amountEdits, onAmountChange, onAmountBlur } = amountEdit

  const floor = dangAmountFloor(item)

  const rawAmount = amountEdits[item.id] !== undefined ? amountEdits[item.id] : item.amount
  const displayAmount = rawAmount === '' ? item.amount : Number(rawAmount)

  return (
    <div
      className={dangCardClass({ paid: item.paid, expanded: expanded && !readOnly })}
      data-highlight-id={item.id}
    >
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
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
                <p className={dangPaidAtClass}>در {formatPaidStamp(item.paidAt)} پرداخت شده</p>
              ) : null}
            </button>

            {readOnly ? null : (
              <DangSettleAction item={item} busy={togglingId === item.id} onToggle={onTogglePaid} />
            )}

            <AccordionCollapse open={expanded && !readOnly}>
              <div className={dangCardAmountEditClass}>
                <AmountField
                  label="مبلغ بدهی"
                  value={item.amount}
                  onChange={value => {
                    onAmountChange(item, value)
                    onAmountBlur(item, value)
                    onExpand(null)
                  }}
                />
                {floor ? (
                  <p className={formHintClass}>{dangMinAmountHint(formatMoney(floor))}</p>
                ) : null}
              </div>
            </AccordionCollapse>
          </div>
        </div>
        <div className={cardActionButtonsClass}>
          <CardEditButton
            itemLabel={item.title}
            onClick={event => {
              event.stopPropagation()
              onEdit(item)
            }}
          />
          <CardDeleteButton
            itemLabel={item.title}
            onClick={event => {
              event.stopPropagation()
              onDelete(item)
            }}
          />
          {readOnly ? null : (
            <CardExpandButton
              itemLabel={item.title}
              expanded={expanded}
              onClick={event => {
                event.stopPropagation()
                onExpand(expanded ? null : item.id)
              }}
              label={expanded ? 'بستن جزئیات' : 'ویرایش مبلغ بدهی'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
