import { receivableSectionLabels } from './paymentLabels'
import type { ReceivableWithRow } from './types'
import { buildSettlementTitle } from './utils'
import { isReceivableComplete, paidAmount, remainingAmount } from '../../services/receivables'
import { getReceivableDisplayTitle } from '../../services/receivablesRow'
import type { SettleOptions } from '../../services/settleOptions'
import { cn } from '../../utils/cn'
import { progressPercent } from '../../utils/progress'
import { AccordionCollapse } from '../AccordionCollapse'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
import MoneyText from '../MoneyText'
import PartialPaymentSection from '../partialPayment/PartialPaymentSection'
import ProgressBar from '../ProgressBar'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  installmentHeaderClass,
  listCardAmountPillClass,
  listCardSubtitleClass,
  listCardTitleClass,
  installmentCardClass
} from '../ui/featureCardStyles'
import WriterAvatar from '../WriterAvatar'

type ReceivableCardProps = {
  item: ReceivableWithRow
  index: number
  expanded: boolean
  payingId: string
  settlingId: string
  togglingPaymentId: string
  paymentReceivableId: string | null
  settlementReceivableId: string | null
  onToggleExpand: (expanded: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onOpenPaymentForm: (receivableId: string) => void
  onClosePaymentForm: () => void
  onOpenSettlementForm: (receivableId: string) => void
  onCloseSettlementForm: () => void
  linkedIds: readonly string[]
  onAddPayment: (values: { amount: number | ''; note: string }, options: SettleOptions) => void
  onSettle: (values: { title: string; note: string }, options: SettleOptions) => void
  onRemovePayment: (paymentId: string) => void
  /** Only the details (desktop table detail row); the row itself shows the summary. */
  bodyOnly?: boolean
}

export default function ReceivableCard({
  item,
  index,
  expanded,
  payingId,
  settlingId,
  togglingPaymentId,
  paymentReceivableId,
  settlementReceivableId,
  onToggleExpand,
  onEdit,
  onDelete,
  onOpenPaymentForm,
  onClosePaymentForm,
  onOpenSettlementForm,
  onCloseSettlementForm,
  linkedIds,
  onAddPayment,
  onSettle,
  onRemovePayment,
  bodyOnly = false
}: ReceivableCardProps) {
  const paid = paidAmount(item)

  const remaining = remainingAmount(item)

  const complete = isReceivableComplete(item)

  const progress = progressPercent(paid, item.amount)

  const displayTitle = getReceivableDisplayTitle(item)

  const showDebtorInSubtitle = Boolean(item.title.trim())

  return (
    <div
      className={bodyOnly ? undefined : installmentCardClass({ expanded, complete })}
      data-highlight-id={bodyOnly ? undefined : item.id}
    >
      {!bodyOnly && (
        <div className={cardHeaderWithEditClass}>
          <button
            type="button"
            className={cn('installment-header', installmentHeaderClass(expanded))}
            onClick={() => onToggleExpand(expanded)}
          >
            <div>
              <div className={listCardTitleClass}>{displayTitle}</div>
              <div className={listCardSubtitleClass}>
                <WriterAvatar email={item.writer} withName />
                {showDebtorInSubtitle && <span>{item.debtor} · </span>}
                {item.category && <span>{item.category} · </span>}
                <span className={listCardAmountPillClass}>
                  <MoneyText amount={item.amount} />
                </span>
                {complete ? (
                  ' · تسویه شده'
                ) : (
                  <>
                    {' · مانده: '}
                    <MoneyText amount={remaining} />
                  </>
                )}
              </div>
              <ProgressBar
                value={progress}
                variant={complete ? 'complete' : progress >= 100 ? 'success' : 'default'}
                animateIndex={index}
                aria-label={`پیشرفت تسویه ${displayTitle}`}
              />
            </div>
          </button>
          <div className={cardActionButtonsClass}>
            <CardEditButton
              itemLabel={item.title}
              onClick={event => {
                event.stopPropagation()
                onEdit()
              }}
            />
            <CardDeleteButton
              itemLabel={item.title}
              onClick={event => {
                event.stopPropagation()
                onDelete()
              }}
            />
            <CardExpandButton
              itemLabel={item.title}
              expanded={expanded}
              onClick={event => {
                event.stopPropagation()
                onToggleExpand(expanded)
              }}
            />
          </div>
        </div>
      )}

      <AccordionCollapse open={expanded}>
        <PartialPaymentSection
          itemId={item.id}
          itemTitle={item.title}
          note={item.note}
          type="income"
          labels={receivableSectionLabels}
          summaryDate={item.borrowDate}
          paid={paid}
          remaining={remaining}
          complete={complete}
          payments={item.payments}
          togglingPaymentId={togglingPaymentId}
          paying={payingId === item.id}
          settling={settlingId === item.id}
          showPaymentForm={paymentReceivableId === item.id}
          showSettlementForm={settlementReceivableId === item.id}
          defaultSettleTitle={buildSettlementTitle(item)}
          defaultSettleNote={item.note ?? ''}
          linkedIds={linkedIds}
          onOpenPaymentForm={() => onOpenPaymentForm(item.id)}
          onClosePaymentForm={onClosePaymentForm}
          onOpenSettlementForm={() => onOpenSettlementForm(item.id)}
          onCloseSettlementForm={onCloseSettlementForm}
          onAddPayment={onAddPayment}
          onSettle={onSettle}
          onRemovePayment={onRemovePayment}
        />
      </AccordionCollapse>
    </div>
  )
}
