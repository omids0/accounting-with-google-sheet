import { dangAmountFloor } from './amountFloor'
import { dangMinAmountHint, dangSectionLabels } from './paymentLabels'
import type { DangAmountEditApi, DangPaymentsApi, DangWithRow } from './types'
import type { SettleOptions } from '../../services/settleOptions'
import { cn } from '../../utils/cn'
import { dangPaidAmount, dangRemaining, isDangSettled } from '../../utils/dangLedger'
import { formatMoney } from '../../utils/formatMoney'
import CardInlineAmountEdit from '../CardInlineAmountEdit'
import PartialPaymentSection from '../partialPayment/PartialPaymentSection'
import type { PaymentFormValues, SettlementFormValues } from '../partialPayment/types'
import { dangCardAmountEditClass } from '../ui/featureCardStyles'
import { useReadOnly } from '../ui/readOnly'

type DangPaymentBodyProps = {
  item: DangWithRow
  payments: DangPaymentsApi
  amountEdit: DangAmountEditApi
  /** Closes the card after the amount is confirmed. */
  onClose: () => void
}

/**
 * The details of a personal debt: payment history, the «ثبت پرداخت» / «تسویه» forms and the
 * inline amount edit. The same body sits in the mobile card and in the desktop table's detail row.
 */
export default function DangPaymentBody({
  item,
  payments,
  amountEdit,
  onClose
}: DangPaymentBodyProps) {
  const readOnly = useReadOnly()

  const { amountEdits, savingAmountId, onAmountChange, onAmountBlur } = amountEdit

  const remaining = dangRemaining(item)

  const floor = dangAmountFloor(item)

  return (
    <>
      <PartialPaymentSection
        itemId={item.id}
        itemTitle={item.title}
        note={item.note}
        type="expense"
        labels={dangSectionLabels}
        summaryDate={item.date}
        paid={dangPaidAmount(item)}
        remaining={remaining}
        complete={isDangSettled(item)}
        payments={item.payments}
        togglingPaymentId={payments.togglingPaymentId}
        paying={payments.payingId === item.id}
        settling={payments.settlingId === item.id}
        showPaymentForm={payments.paymentItemId === item.id}
        showSettlementForm={payments.settlementItemId === item.id}
        defaultSettleTitle=""
        defaultSettleNote={item.note}
        defaultPaymentAmount={remaining}
        linkedIds={payments.linkedIds}
        onOpenPaymentForm={() => payments.setPaymentItemId(item.id)}
        onClosePaymentForm={() => payments.setPaymentItemId(null)}
        onOpenSettlementForm={() => payments.setSettlementItemId(item.id)}
        onCloseSettlementForm={() => payments.setSettlementItemId(null)}
        onAddPayment={(values: PaymentFormValues, options: SettleOptions) =>
          payments.handleAddPayment(item, values, options)
        }
        onSettle={(values: SettlementFormValues, options: SettleOptions) =>
          payments.handleSettle(item, values, options)
        }
        onRemovePayment={paymentId => payments.handleRemovePayment(item, paymentId)}
      />
      {readOnly ? null : (
        <div className={cn(dangCardAmountEditClass, 'px-2 pb-2')}>
          <CardInlineAmountEdit
            label="مبلغ بدهی"
            value={amountEdits[item.id] !== undefined ? amountEdits[item.id] : item.amount}
            hint={floor ? dangMinAmountHint(formatMoney(floor)) : undefined}
            onChange={value => onAmountChange(item, value)}
            onBlur={() => onAmountBlur(item)}
            onClose={onClose}
            saving={savingAmountId === item.id}
          />
        </div>
      )}
    </>
  )
}
