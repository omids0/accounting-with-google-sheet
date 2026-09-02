import { getInstallmentPaymentAmount } from '../../services/installments'
import type { InstallmentPlan } from '../../types'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { AccordionCollapse } from '../AccordionCollapse'
import AppIcon from '../AppIcon'
import CardInlineAmountEdit from '../CardInlineAmountEdit'
import type { PlanWithRow } from '../InstallmentPlanCard'

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
      className={`installment-payment-item${
        paymentExpanded ? ' installment-payment-item--expanded' : ''
      }${payment.paid ? ' paid' : ''}`}
    >
      <div className="installment-payment-row">
        <input
          type="checkbox"
          checked={payment.paid}
          disabled={togglingPaymentIndex === paymentIndex}
          onChange={e => onTogglePayment(plan, paymentIndex, e.target.checked)}
          onClick={e => e.stopPropagation()}
        />
        <button
          type="button"
          className={`installment-payment-header${
            paymentExpanded ? ' installment-payment-header--expanded' : ''
          }`}
          onClick={() => onToggleExpand(paymentIndex)}
        >
          <div className="installment-payment-info">
            <span>قسط {payment.n.toLocaleString('fa-IR')}</span>
            <span className="installment-due">موعد: {formatIsoDatePersian(payment.dueDate)}</span>
            {payment.paid && payment.paidAt && (
              <span className="installment-paid-at">
                پرداخت: {formatIsoDatePersian(payment.paidAt)}
              </span>
            )}
          </div>
          <div className="wallet-item-amount installment-payment-amount-display" dir="ltr">
            {formatMoney(displayAmount)}
          </div>
          <AppIcon
            name="chevron-down"
            size={14}
            strokeWidth={2}
            className={`installment-payment-chevron${
              paymentExpanded ? ' installment-payment-chevron--expanded' : ''
            }`}
          />
        </button>
      </div>

      <AccordionCollapse open={paymentExpanded}>
        <div className="installment-payment-edit">
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
