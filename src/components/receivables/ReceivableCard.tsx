import { isReceivableComplete, paidAmount, remainingAmount } from '../../services/receivables'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { AccordionCollapse } from '../AccordionCollapse'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
import ProgressBar from '../ProgressBar'
import ReceivablePaymentForm from './ReceivablePaymentForm'
import ReceivableSettlementForm from './ReceivableSettlementForm'
import type { ReceivableWithRow } from './types'
import { buildSettlementTitle } from './utils'
import Button from '../ui/Button'

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
  onAddPayment: (values: { amount: number | ''; note: string }) => void
  onSettle: (values: { title: string; note: string }) => void
  onRemovePayment: (paymentId: string) => void
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
  onAddPayment,
  onSettle,
  onRemovePayment
}: ReceivableCardProps) {
  const paid = paidAmount(item)

  const remaining = remainingAmount(item)

  const complete = isReceivableComplete(item)

  const progress = item.amount > 0 ? Math.round((paid / item.amount) * 100) : 0

  const showPaymentForm = paymentReceivableId === item.id
  const showSettlementForm = settlementReceivableId === item.id

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
              {showPaymentForm ? (
                <ReceivablePaymentForm
                  receivableId={item.id}
                  paying={payingId === item.id}
                  onSubmit={onAddPayment}
                  onCancel={onClosePaymentForm}
                />
              ) : showSettlementForm ? (
                <ReceivableSettlementForm
                  receivableId={item.id}
                  remaining={remaining}
                  defaultTitle={buildSettlementTitle(item.debtor)}
                  defaultNote={item.note ?? ''}
                  settling={settlingId === item.id}
                  onSubmit={onSettle}
                  onCancel={onCloseSettlementForm}
                />
              ) : (
                <div className="receivable-add-payment-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onCloseSettlementForm()
                      onOpenPaymentForm(item.id)
                    }}
                  >
                    + ثبت بخشی از پرداخت
                  </Button>
                  <Button
                    type="button"
                    variant="inflow"
                    size="sm"
                    onClick={() => {
                      onClosePaymentForm()
                      onOpenSettlementForm(item.id)
                    }}
                  >
                    تسویه
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </AccordionCollapse>
    </div>
  )
}
