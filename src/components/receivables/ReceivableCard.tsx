import { isReceivableComplete, paidAmount, remainingAmount } from '../../services/receivables'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { AccordionCollapse } from '../AccordionCollapse'
import AmountInput from '../AmountInput'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
import { FormField } from '../form'
import ProgressBar from '../ProgressBar'
import type { PaymentFormState, ReceivableWithRow, SettlementFormState } from './types'
import { buildSettlementTitle } from './utils'

type ReceivableCardProps = {
  item: ReceivableWithRow
  index: number
  expanded: boolean
  payingId: string
  settlingId: string
  togglingPaymentId: string
  paymentForm: PaymentFormState | null
  settlementForm: SettlementFormState | null
  onToggleExpand: (expanded: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onPaymentFormChange: (form: PaymentFormState | null) => void
  onSettlementFormChange: (form: SettlementFormState | null) => void
  onAddPayment: () => void
  onSettle: () => void
  onRemovePayment: (paymentId: string) => void
}

export default function ReceivableCard({
  item,
  index,
  expanded,
  payingId,
  settlingId,
  togglingPaymentId,
  paymentForm,
  settlementForm,
  onToggleExpand,
  onEdit,
  onDelete,
  onPaymentFormChange,
  onSettlementFormChange,
  onAddPayment,
  onSettle,
  onRemovePayment
}: ReceivableCardProps) {
  const paid = paidAmount(item)

  const remaining = remainingAmount(item)

  const complete = isReceivableComplete(item)

  const progress = item.amount > 0 ? Math.round((paid / item.amount) * 100) : 0

  return (
    <div
      className={`card installment-card interactive-card${complete ? ' receivable-complete' : ''}${
        expanded ? ' installment-card--expanded' : ''
      }`}
    >
      <div className="card-header-with-edit">
        <button
          type="button"
          className={`installment-header${expanded ? ' installment-header--expanded' : ''}`}
          onClick={() => onToggleExpand(expanded)}
        >
          <div>
            <div className="list-card-title">{item.debtor}</div>
            <div className="list-card-subtitle">
              {item.category && <span>{item.category} · </span>}
              <span className="list-card-amount-pill">{formatMoney(item.amount)}</span>
              {complete ? ' · تسویه شده' : ` · مانده: ${formatMoney(remaining)}`}
            </div>
            <ProgressBar
              value={progress}
              variant={complete ? 'complete' : progress >= 100 ? 'success' : 'default'}
              animateIndex={index}
              aria-label={`پیشرفت تسویه ${item.debtor}`}
            />
          </div>
        </button>
        <div className="card-action-buttons">
          <CardEditButton
            onClick={event => {
              event.stopPropagation()
              onEdit()
            }}
          />
          <CardDeleteButton
            onClick={event => {
              event.stopPropagation()
              onDelete()
            }}
          />
          <CardExpandButton
            expanded={expanded}
            onClick={event => {
              event.stopPropagation()
              onToggleExpand(expanded)
            }}
            ariaLabel={expanded ? 'بستن جزئیات' : 'نمایش جزئیات طلب'}
          />
        </div>
      </div>

      <AccordionCollapse open={expanded}>
        <div className="installment-payments">
          {item.note && <p className="installment-note">{item.note}</p>}

          <div className="receivable-summary">
            <div>
              <span className="receivable-summary-label">تاریخ قرض</span>
              <span>{formatIsoDatePersian(item.borrowDate)}</span>
            </div>
            <div>
              <span className="receivable-summary-label">پرداخت شده</span>
              <span className="receivable-paid">{formatMoney(paid)}</span>
            </div>
            <div>
              <span className="receivable-summary-label">مانده</span>
              <span className={complete ? 'receivable-settled' : 'receivable-remaining'}>
                {formatMoney(remaining)}
              </span>
            </div>
          </div>

          {item.payments.length > 0 && (
            <div className="receivable-payment-list">
              <div className="receivable-payment-list-title">سوابق پرداخت</div>
              {item.payments.map(payment => (
                <div key={payment.id} className="receivable-payment-item">
                  <input
                    type="checkbox"
                    checked
                    disabled={togglingPaymentId === payment.id}
                    onChange={() => onRemovePayment(payment.id)}
                    onClick={e => e.stopPropagation()}
                  />
                  <div>
                    <span dir="ltr">{formatMoney(payment.amount)}</span>
                    <span className="installment-due">{formatIsoDatePersian(payment.paidAt)}</span>
                    {payment.note && <span className="installment-due">{payment.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!complete && (
            <div className="receivable-add-payment">
              {paymentForm?.receivableId === item.id ? (
                <div className="receivable-payment-form">
                  <FormField label="مبلغ پرداخت" style={{ marginBottom: '0.75rem' }}>
                    <AmountInput
                      value={paymentForm.amount}
                      onChange={val =>
                        onPaymentFormChange(
                          paymentForm ? { ...paymentForm, amount: val } : paymentForm
                        )
                      }
                    />
                  </FormField>
                  <FormField label="توضیحات" style={{ marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      value={paymentForm.note}
                      onChange={e =>
                        onPaymentFormChange(
                          paymentForm ? { ...paymentForm, note: e.target.value } : paymentForm
                        )
                      }
                      placeholder="اختیاری"
                    />
                  </FormField>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={payingId === item.id}
                      onClick={onAddPayment}
                    >
                      {payingId === item.id && <span className="spinner" />}
                      ثبت بخشی از پرداخت
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onPaymentFormChange(null)}
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              ) : settlementForm?.receivableId === item.id ? (
                <div className="receivable-payment-form">
                  <FormField label="عنوان درآمد" required style={{ marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      value={settlementForm.title}
                      onChange={e =>
                        onSettlementFormChange(
                          settlementForm
                            ? { ...settlementForm, title: e.target.value }
                            : settlementForm
                        )
                      }
                      placeholder="مثلاً: طلب: علی محمدی"
                    />
                  </FormField>
                  <FormField label="مبلغ تسویه" style={{ marginBottom: '0.75rem' }}>
                    <input type="text" value={formatMoney(remaining)} readOnly dir="ltr" />
                  </FormField>
                  <FormField label="توضیحات" style={{ marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      value={settlementForm.note}
                      onChange={e =>
                        onSettlementFormChange(
                          settlementForm
                            ? { ...settlementForm, note: e.target.value }
                            : settlementForm
                        )
                      }
                      placeholder="اختیاری"
                    />
                  </FormField>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-inflow btn-sm"
                      disabled={settlingId === item.id}
                      onClick={onSettle}
                    >
                      {settlingId === item.id && <span className="spinner" />}
                      تسویه
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSettlementFormChange(null)}
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              ) : (
                <div className="receivable-add-payment-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      onSettlementFormChange(null)
                      onPaymentFormChange({
                        receivableId: item.id,
                        amount: '',
                        note: ''
                      })
                    }}
                  >
                    + ثبت بخشی از پرداخت
                  </button>
                  <button
                    type="button"
                    className="btn btn-inflow btn-sm"
                    onClick={() => {
                      onPaymentFormChange(null)
                      onSettlementFormChange({
                        receivableId: item.id,
                        title: buildSettlementTitle(item.debtor),
                        note: item.note ?? ''
                      })
                    }}
                  >
                    تسویه
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </AccordionCollapse>
    </div>
  )
}
