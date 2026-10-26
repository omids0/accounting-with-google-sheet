import PartialPaymentForm from './PartialPaymentForm'
import PartialSettlementForm from './PartialSettlementForm'
import type {
  PartialPaymentLine,
  PartialPaymentSectionLabels,
  PartialPaymentType,
  PaymentFormValues,
  SettlementFormValues
} from './types'
import type { SettleOptions } from '../../services/settleOptions'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import TapCheckbox from '../form/TapCheckbox'
import MoneyText from '../MoneyText'
import Button from '../ui/Button'
import {
  installmentDueClass,
  installmentNoteClass,
  installmentPaymentsClass
} from '../ui/featureCardStyles'
import { useReadOnly } from '../ui/readOnly'
import {
  receivableAddPaymentActionsClass,
  receivableAddPaymentClass,
  receivablePaidClass,
  receivablePaymentItemClass,
  receivablePaymentListClass,
  receivablePaymentListTitleClass,
  receivableRemainingClass,
  receivableSettledClass,
  receivableSummaryClass,
  receivableSummaryLabelClass
} from '../ui/treasuryReceivableStyles'

type PartialPaymentSectionProps = {
  itemId: string
  /** Names the item in the «برگرداندن پرداخت» label of each payment. */
  itemTitle: string
  note?: string
  /** Money in (a receivable) or out (a debt). */
  type: PartialPaymentType
  labels: PartialPaymentSectionLabels
  /** The date shown first in the summary (the loan date of a receivable). */
  summaryDate: string
  paid: number
  remaining: number
  complete: boolean
  payments: readonly PartialPaymentLine[]
  /** The payment being taken back, if any. */
  togglingPaymentId: string
  paying: boolean
  settling: boolean
  showPaymentForm: boolean
  showSettlementForm: boolean
  defaultSettleTitle: string
  defaultSettleNote: string
  /** `transactionRecordId` of every payment of the module (the duplicate check skips them). */
  linkedIds: readonly string[]
  onOpenPaymentForm: () => void
  onClosePaymentForm: () => void
  onOpenSettlementForm: () => void
  onCloseSettlementForm: () => void
  onAddPayment: (values: PaymentFormValues, options: SettleOptions) => void
  onSettle: (values: SettlementFormValues, options: SettleOptions) => void
  onRemovePayment: (paymentId: string) => void
}

/**
 * The details of a card with partial payments: summary, payment history with take-back, and the
 * «ثبت بخشی از پرداخت» / «تسویه» forms. Under a read-only role nothing can be changed.
 */
export default function PartialPaymentSection({
  itemId,
  itemTitle,
  note,
  type,
  labels,
  summaryDate,
  paid,
  remaining,
  complete,
  payments,
  togglingPaymentId,
  paying,
  settling,
  showPaymentForm,
  showSettlementForm,
  defaultSettleTitle,
  defaultSettleNote,
  linkedIds,
  onOpenPaymentForm,
  onClosePaymentForm,
  onOpenSettlementForm,
  onCloseSettlementForm,
  onAddPayment,
  onSettle,
  onRemovePayment
}: PartialPaymentSectionProps) {
  const readOnly = useReadOnly()

  return (
    <div className={installmentPaymentsClass}>
      {note && <p className={installmentNoteClass}>{note}</p>}

      <div className={receivableSummaryClass}>
        <div>
          <span className={receivableSummaryLabelClass}>{labels.dateLabel}</span>
          <span>{formatIsoDatePersian(summaryDate)}</span>
        </div>
        <div>
          <span className={receivableSummaryLabelClass}>پرداخت شده</span>
          <span className={receivablePaidClass}>
            <MoneyText amount={paid} />
          </span>
        </div>
        <div>
          <span className={receivableSummaryLabelClass}>مانده</span>
          <span className={complete ? receivableSettledClass : receivableRemainingClass}>
            <MoneyText amount={remaining} />
          </span>
        </div>
      </div>

      {payments.length > 0 && (
        <div className={receivablePaymentListClass}>
          <div className={receivablePaymentListTitleClass}>سوابق پرداخت</div>
          {payments.map(payment => (
            <div key={payment.id} className={receivablePaymentItemClass}>
              <TapCheckbox
                checked
                aria-label={`برگرداندن پرداخت ${itemTitle}`}
                disabled={togglingPaymentId === payment.id || readOnly}
                onChange={() => onRemovePayment(payment.id)}
                onClick={e => e.stopPropagation()}
              />
              <div>
                <span>
                  <MoneyText amount={payment.amount} />
                </span>
                <span className={installmentDueClass}>{formatIsoDatePersian(payment.paidAt)}</span>
                {payment.note && <span className={installmentDueClass}>{payment.note}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!complete && !readOnly && (
        <div className={receivableAddPaymentClass}>
          {showPaymentForm ? (
            <PartialPaymentForm
              itemId={itemId}
              type={type}
              labels={labels.paymentForm}
              paying={paying}
              linkedIds={linkedIds}
              onSubmit={onAddPayment}
              onCancel={onClosePaymentForm}
            />
          ) : showSettlementForm ? (
            <PartialSettlementForm
              itemId={itemId}
              type={type}
              labels={labels.settlementForm}
              remaining={remaining}
              defaultTitle={defaultSettleTitle}
              defaultNote={defaultSettleNote}
              settling={settling}
              linkedIds={linkedIds}
              onSubmit={onSettle}
              onCancel={onCloseSettlementForm}
            />
          ) : (
            <div className={receivableAddPaymentActionsClass}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  onCloseSettlementForm()
                  onOpenPaymentForm()
                }}
              >
                + ثبت بخشی از پرداخت
              </Button>
              <Button
                type="button"
                variant={type === 'income' ? 'inflow' : 'outflow'}
                size="sm"
                onClick={() => {
                  onClosePaymentForm()
                  onOpenSettlementForm()
                }}
              >
                تسویه
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
