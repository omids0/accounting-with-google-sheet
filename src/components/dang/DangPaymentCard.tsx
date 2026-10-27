import DangPaymentBody from './DangPaymentBody'
import type { DangAmountEditApi, DangPaymentsApi, DangWithRow } from './types'
import { cn } from '../../utils/cn'
import { dangPaidAmount, dangRemaining, isDangSettled } from '../../utils/dangLedger'
import { progressPercent } from '../../utils/progress'
import { AccordionCollapse } from '../AccordionCollapse'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
import MoneyText from '../MoneyText'
import ProgressBar from '../ProgressBar'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  installmentCardClass,
  installmentHeaderClass,
  listCardAmountPillClass,
  listCardSubtitleClass,
  listCardTitleClass
} from '../ui/featureCardStyles'
import WriterAvatar from '../WriterAvatar'

type DangPaymentCardProps = {
  item: DangWithRow
  index: number
  expanded: boolean
  payments: DangPaymentsApi
  amountEdit: DangAmountEditApi
  /** Opens the card, or closes it with `null`. */
  onExpand: (id: string | null) => void
  onEdit: (item: DangWithRow) => void
  onDelete: (item: DangWithRow) => void
  /** Only the details (desktop table detail row); the row itself shows the summary. */
  bodyOnly?: boolean
}

/** A personal debt card: progress, paid and remaining in the header, payments in the details. */
export default function DangPaymentCard({
  item,
  index,
  expanded,
  payments,
  amountEdit,
  onExpand,
  onEdit,
  onDelete,
  bodyOnly = false
}: DangPaymentCardProps) {
  const paid = dangPaidAmount(item)

  const remaining = dangRemaining(item)

  const settled = isDangSettled(item)

  const progress = progressPercent(paid, item.amount)

  const toggle = () => onExpand(expanded ? null : item.id)

  const body = (
    <DangPaymentBody
      item={item}
      payments={payments}
      amountEdit={amountEdit}
      onClose={() => onExpand(null)}
    />
  )

  if (bodyOnly) return body

  return (
    <div
      className={installmentCardClass({ expanded, complete: settled })}
      data-highlight-id={item.id}
    >
      <div className={cardHeaderWithEditClass}>
        <button
          type="button"
          className={cn('installment-header', installmentHeaderClass(expanded))}
          onClick={toggle}
        >
          <div>
            <div className={listCardTitleClass}>{item.title}</div>
            <div className={listCardSubtitleClass}>
              <WriterAvatar email={item.writer} withName />
              {item.category && <span>{item.category} · </span>}
              <span>طرف حساب: {item.counterparty} · </span>
              <span className={listCardAmountPillClass}>
                <MoneyText amount={item.amount} />
              </span>
              {settled ? (
                ' · تسویه شده'
              ) : (
                <>
                  {paid > 0 && (
                    <>
                      {' · پرداخت شده: '}
                      <MoneyText amount={paid} />
                    </>
                  )}
                  {' · مانده: '}
                  <MoneyText amount={remaining} />
                </>
              )}
            </div>
            <ProgressBar
              value={progress}
              variant={settled ? 'complete' : progress >= 100 ? 'success' : 'default'}
              animateIndex={index}
              aria-label={`پیشرفت پرداخت ${item.title}`}
            />
          </div>
        </button>
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
          <CardExpandButton
            itemLabel={item.title}
            expanded={expanded}
            onClick={event => {
              event.stopPropagation()
              toggle()
            }}
          />
        </div>
      </div>

      <AccordionCollapse open={expanded}>{body}</AccordionCollapse>
    </div>
  )
}
