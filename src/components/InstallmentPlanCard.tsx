import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import {
  getFirstInstallmentDueDate,
  getInstallmentDuePaymentAmount,
  getInstallmentEndDate,
  getInstallmentPaymentAmount,
  paidInstallmentAmount,
  remainingInstallmentAmount,
  sortInstallmentPayments,
  totalInstallmentAmount
} from '../services/installments'
import type { InstallmentPlan } from '../types'
import { AccordionCollapse } from './AccordionCollapse'
import AppIcon from './AppIcon'
import CardDeleteButton from './CardDeleteButton'
import CardEditButton from './CardEditButton'
import CardExpandButton from './CardExpandButton'
import CardInlineAmountEdit from './CardInlineAmountEdit'
import MoneyDisplay from './MoneyDisplay'
import ProgressBar from './ProgressBar'
import { formatMoney } from '../utils/formatMoney'
import { formatIsoDatePersian } from '../utils/jalaliDate'
import { showError } from '../utils/toast'

export type PlanWithRow = InstallmentPlan & { rowNumber: number }

export type InstallmentPlanCardProps = {
  plan: PlanWithRow
  expanded: boolean
  done: number
  complete: boolean
  progress: number
  dueDate: string
  togglingPaymentIndex: number | null
  onToggleExpand: (planId: string) => void
  onEdit: (plan: PlanWithRow) => void
  onDelete: (plan: PlanWithRow) => void
  onTogglePayment: (plan: PlanWithRow, paymentIndex: number, paid: boolean) => void
  onPaymentAmountSave: (plan: PlanWithRow, paymentIndex: number, amount: number) => Promise<void>
}

function InstallmentPlanCard({
  plan,
  expanded,
  done,
  complete,
  progress,
  dueDate,
  togglingPaymentIndex,
  onToggleExpand,
  onEdit,
  onDelete,
  onTogglePayment,
  onPaymentAmountSave
}: InstallmentPlanCardProps) {
  const [expandedPaymentIndex, setExpandedPaymentIndex] = useState<number | null>(null)

  const [paymentAmounts, setPaymentAmounts] = useState<Record<number, number | ''>>({})

  const [savingPaymentIndex, setSavingPaymentIndex] = useState<number | null>(null)

  const sortedPayments = useMemo(() => sortInstallmentPayments(plan.payments), [plan.payments])

  useEffect(() => {
    const next: Record<number, number | ''> = {}

    plan.payments.forEach((payment, paymentIndex) => {
      next[paymentIndex] = getInstallmentPaymentAmount(payment, plan)
    })
    setPaymentAmounts(next)
    setExpandedPaymentIndex(null)
  }, [plan])

  const handleToggleExpand = useCallback(() => {
    if (expanded) setExpandedPaymentIndex(null)
    onToggleExpand(plan.id)
  }, [expanded, onToggleExpand, plan.id])

  const handlePaymentAmountSave = useCallback(
    async (paymentIndex: number) => {
      const nextAmount = paymentAmounts[paymentIndex]

      if (nextAmount === '' || nextAmount === undefined) {
        showError('مبلغ نامعتبر است')

        const payment = plan.payments[paymentIndex]

        if (!payment) return
        setPaymentAmounts(prev => ({
          ...prev,
          [paymentIndex]: getInstallmentPaymentAmount(payment, plan)
        }))

        return
      }
      if (nextAmount <= 0) {
        showError('مبلغ باید بیشتر از صفر باشد')

        const payment = plan.payments[paymentIndex]

        if (!payment) return
        setPaymentAmounts(prev => ({
          ...prev,
          [paymentIndex]: getInstallmentPaymentAmount(payment, plan)
        }))

        return
      }

      const payment = plan.payments[paymentIndex]

      if (!payment) return

      const currentAmount = getInstallmentPaymentAmount(payment, plan)

      if (nextAmount === currentAmount) return

      setSavingPaymentIndex(paymentIndex)
      try {
        await onPaymentAmountSave(plan, paymentIndex, nextAmount)
      } finally {
        setSavingPaymentIndex(null)
      }
    },
    [onPaymentAmountSave, paymentAmounts, plan]
  )

  const total = plan.count

  const totalAmount = useMemo(() => totalInstallmentAmount(plan), [plan])

  const paidAmount = useMemo(() => paidInstallmentAmount(plan), [plan])

  const remainingAmount = useMemo(() => remainingInstallmentAmount(plan), [plan])

  const dueAmount = useMemo(
    () => (dueDate ? getInstallmentDuePaymentAmount(plan, dueDate) : null),
    [plan, dueDate]
  )

  const firstDueDate = getFirstInstallmentDueDate(plan.startDate, plan.dueDay)

  const endDate = getInstallmentEndDate(plan.startDate, plan.count, plan.dueDay)

  return (
    <div
      className={`card installment-card interactive-card${complete ? ' installment-complete' : ''}${
        expanded ? ' installment-card--expanded' : ''
      }`}
    >
      <div className="card-header-with-edit">
        <button
          type="button"
          className={`installment-header${expanded ? ' installment-header--expanded' : ''}`}
          onClick={handleToggleExpand}
        >
          <div>
            <div className="list-card-title">{plan.title}</div>
            <div className="list-card-subtitle">
              {complete
                ? 'تکمیل شده'
                : `${done.toLocaleString('fa-IR')}/${total.toLocaleString('fa-IR')} قسط پرداخت شده`}
            </div>
            {dueDate ? (
              <div className="installment-due-line list-card-subtitle">
                <span className="installment-due">
                  موعد پرداخت: {formatIsoDatePersian(dueDate)}
                </span>
                {dueAmount !== null ? (
                  <MoneyDisplay amount={dueAmount} size="record" tone="primary" />
                ) : null}
              </div>
            ) : null}
            {firstDueDate && endDate ? (
              <div className="list-card-subtitle installment-range-line">
                <span className="installment-due">
                  بازه قسط: {formatIsoDatePersian(firstDueDate)} تا {formatIsoDatePersian(endDate)}
                </span>
              </div>
            ) : null}
            <ProgressBar
              value={progress}
              variant={complete ? 'complete' : progress >= 100 ? 'success' : 'default'}
              animated={false}
              aria-label={`پیشرفت پرداخت ${plan.title}`}
            />
          </div>
        </button>
        <div className="card-action-buttons">
          <CardEditButton
            onClick={event => {
              event.stopPropagation()
              onEdit(plan)
            }}
          />
          <CardDeleteButton
            onClick={event => {
              event.stopPropagation()
              onDelete(plan)
            }}
          />
          <CardExpandButton
            expanded={expanded}
            onClick={event => {
              event.stopPropagation()
              handleToggleExpand()
            }}
            ariaLabel={expanded ? 'بستن جزئیات' : 'نمایش جزئیات اقساط'}
          />
        </div>
      </div>

      <AccordionCollapse open={expanded}>
        <div className="installment-payments">
          <div className="installment-amount-summary" aria-label={`خلاصه مبلغ ${plan.title}`}>
            <div className="installment-amount-row">
              <span className="installment-amount-summary-label">کل قابل واریز</span>
              <MoneyDisplay amount={totalAmount} size="record" />
            </div>
            <div className="installment-amount-row">
              <span className="installment-amount-summary-label">واریز شده</span>
              <MoneyDisplay amount={paidAmount} size="record" tone="positive" />
            </div>
            <div className="installment-amount-row">
              <span className="installment-amount-summary-label">مانده</span>
              <MoneyDisplay
                amount={remainingAmount}
                size="record"
                tone={complete ? 'default' : 'primary'}
              />
            </div>
          </div>
          {plan.note && <p className="installment-note">{plan.note}</p>}
          {sortedPayments.map(({ payment, index: paymentIndex }) => {
            const paymentExpanded = expandedPaymentIndex === paymentIndex

            const rawAmount =
              paymentAmounts[paymentIndex] ?? getInstallmentPaymentAmount(payment, plan)

            const displayAmount =
              rawAmount === '' ? getInstallmentPaymentAmount(payment, plan) : Number(rawAmount)

            return (
              <div
                key={payment.n}
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
                    onClick={() =>
                      setExpandedPaymentIndex(prev => (prev === paymentIndex ? null : paymentIndex))
                    }
                  >
                    <div className="installment-payment-info">
                      <span>قسط {payment.n.toLocaleString('fa-IR')}</span>
                      <span className="installment-due">
                        موعد: {formatIsoDatePersian(payment.dueDate)}
                      </span>
                      {payment.paid && payment.paidAt && (
                        <span className="installment-paid-at">
                          پرداخت: {formatIsoDatePersian(payment.paidAt)}
                        </span>
                      )}
                    </div>
                    <div
                      className="wallet-item-amount installment-payment-amount-display"
                      dir="ltr"
                    >
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
                      value={
                        paymentAmounts[paymentIndex] ?? getInstallmentPaymentAmount(payment, plan)
                      }
                      onChange={val =>
                        setPaymentAmounts(prev => ({ ...prev, [paymentIndex]: val }))
                      }
                      onBlur={() => handlePaymentAmountSave(paymentIndex)}
                      onClose={() => setExpandedPaymentIndex(null)}
                      saving={savingPaymentIndex === paymentIndex}
                    />
                  </div>
                </AccordionCollapse>
              </div>
            )
          })}
        </div>
      </AccordionCollapse>
    </div>
  )
}

export default memo(InstallmentPlanCard)
