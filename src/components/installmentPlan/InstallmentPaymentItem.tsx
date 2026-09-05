import { getInstallmentPaymentAmount } from '../../services/installments'
import type { InstallmentPlan } from '../../types'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { AccordionCollapse } from '../AccordionCollapse'
import AppIcon from '../AppIcon'
import CardInlineAmountEdit from '../CardInlineAmountEdit'
import type { PlanWithRow } from '../InstallmentPlanCard'
import {
  installmentDueClass,
  installmentPaidAtClass,
  installmentPaymentAmountDisplayClass,
  installmentPaymentChevronClass,
  installmentPaymentEditClass,
  installmentPaymentHeaderClass,
  installmentPaymentInfoClass,
  installmentPaymentItemClass,
  installmentPaymentRowClass
} from '../ui/featureCardStyles'

interface InstallmentPaymentItemProps {
  plan: PlanWithRow
  payment: InstallmentPlan['payments'][number]
  paymentIndex: number
  paymentAmounts: Record<number, number | ''>
  expandedPaymentIndex: number | null
  togglingPaymentIndex: number | null
  savingPaymentIndex: number | null
  onTogglePayment: (plan: PlanWithRow, paymentIndex: number, paid: boolean) => void
  onPaymentAmountChange: (paymentIndex: number, value: number | '') => void
  onToggleExpand: (paymentIndex: number) => void
  onPaymentAmountSave: (paymentIndex: number) => void
  onCloseExpand: () => void
}

export default function InstallmentPaymentItem({
  plan,
  payment,
  paymentIndex,
  paymentAmounts,
  expandedPaymentIndex,
  togglingPaymentIndex,
  savingPaymentIndex,
  onTogglePayment,
  onPaymentAmountChange,
  onToggleExpand,
  onPaymentAmountSave,
  onCloseExpand
}: InstallmentPaymentItemProps) {
  const paymentExpanded = expandedPaymentIndex === paymentIndex

  const rawAmount = paymentAmounts[paymentIndex] ?? getInstallmentPaymentAmount(payment, plan)

  const displayAmount =
    rawAmount === '' ? getInstallmentPaymentAmount(payment, plan) : Number(rawAmount)

  return (
    <div
      className={cn(
        'installment-payment-item',
        installmentPaymentItemClass({ expanded: paymentExpanded, paid: payment.paid })
      )}
    >
      <div className={installmentPaymentRowClass}>
        <input
          type="checkbox"
          checked={payment.paid}
          disabled={togglingPaymentIndex === paymentIndex}
          onChange={e => onTogglePayment(plan, paymentIndex, e.target.checked)}
          onClick={e => e.stopPropagation()}
        />
        <button
          type="button"
          className={installmentPaymentHeaderClass}
          onClick={() => onToggleExpand(paymentIndex)}
        >
          <div className={installmentPaymentInfoClass}>
            <span>قسط {payment.n.toLocaleString('fa-IR')}</span>
            <span className={installmentDueClass}>
              موعد: {formatIsoDatePersian(payment.dueDate)}
            </span>
            {payment.paid && payment.paidAt ? (
              <span className={installmentPaidAtClass}>
                پرداخت: {formatIsoDatePersian(payment.paidAt)}
              </span>
            ) : null}
          </div>
          <div className={installmentPaymentAmountDisplayClass} dir="ltr">
            {formatMoney(displayAmount)}
          </div>
          <AppIcon
            name="chevron-down"
            size={14}
            strokeWidth={2}
            className={installmentPaymentChevronClass(paymentExpanded)}
          />
        </button>
      </div>

      <AccordionCollapse open={paymentExpanded}>
        <div className={installmentPaymentEditClass}>
          <CardInlineAmountEdit
            label="مبلغ قسط"
            value={paymentAmounts[paymentIndex] ?? getInstallmentPaymentAmount(payment, plan)}
            onChange={val => onPaymentAmountChange(paymentIndex, val)}
            onBlur={() => onPaymentAmountSave(paymentIndex)}
            onClose={onCloseExpand}
            saving={savingPaymentIndex === paymentIndex}
          />
        </div>
      </AccordionCollapse>
    </div>
  )
}
