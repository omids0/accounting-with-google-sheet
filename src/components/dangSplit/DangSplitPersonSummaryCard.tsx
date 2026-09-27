import DangSplitPaymentForm from './DangSplitPaymentForm'
import { dangSplitStatusClass } from './dangSplitStyles'
import type { DangSplitPersonSummary } from '../../types/dangSplit'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { AccordionCollapse } from '../AccordionCollapse'
import CardExpandButton from '../CardExpandButton'
import ProgressBar from '../ProgressBar'
import Button from '../ui/Button'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  installmentCardClass,
  installmentDueClass,
  installmentHeaderClass,
  installmentPaymentsClass,
  listCardAmountPillClass,
  listCardSubtitleClass,
  listCardTitleClass
} from '../ui/featureCardStyles'
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

const STATUS_LABELS: Record<DangSplitPersonSummary['status'], string> = {
  settled: 'تسویه کامل',
  partial: 'پرداخت جزئی',
  unpaid: 'نپرداخته',
  none: 'بدون سهم'
}

export default function DangSplitPersonSummaryCard({
  item,
  categoryTitle,
  index,
  expanded,
  saving,
  showPaymentForm,
  onToggleExpand,
  onOpenPaymentForm,
  onClosePaymentForm,
  onAddPayment,
  onSettleFull,
  onUndoPayments
}: {
  item: DangSplitPersonSummary
  categoryTitle: string
  index: number
  expanded: boolean
  saving: boolean
  showPaymentForm: boolean
  onToggleExpand: () => void
  onOpenPaymentForm: () => void
  onClosePaymentForm: () => void
  onAddPayment: (amount: number | '') => void
  onSettleFull: () => void
  onUndoPayments: () => void
}) {
  const complete = item.status === 'settled'
  const progress = item.share > 0 ? Math.round((item.paid / item.share) * 100) : 0

  return (
    <div className={installmentCardClass({ expanded, complete })}>
      <div className={cardHeaderWithEditClass}>
        <button
          type="button"
          className={cn('installment-header', installmentHeaderClass(expanded))}
          onClick={onToggleExpand}
        >
          <div>
            <div className={listCardTitleClass}>{item.name || '—'}</div>
            <div className={listCardSubtitleClass}>
              {categoryTitle ? <span>{categoryTitle} · </span> : null}
              <span className={listCardAmountPillClass}>{formatMoney(item.share)}</span>
              {' · '}
              <span className={dangSplitStatusClass(item.status)}>
                {STATUS_LABELS[item.status]}
              </span>
              {complete || item.share === 0 ? '' : ` · مانده: ${formatMoney(item.balance)}`}
            </div>
            <ProgressBar
              value={progress}
              variant={complete ? 'complete' : progress >= 100 ? 'success' : 'default'}
              animateIndex={index}
              aria-label={`پیشرفت تسویه ${item.name}`}
            />
          </div>
        </button>
        <div className={cardActionButtonsClass}>
          <CardExpandButton
            expanded={expanded}
            onClick={event => {
              event.stopPropagation()
              onToggleExpand()
            }}
            ariaLabel={expanded ? 'بستن جزئیات' : 'نمایش جزئیات سهم'}
          />
        </div>
      </div>

      <AccordionCollapse open={expanded}>
        <div className={installmentPaymentsClass}>
          <div className={receivableSummaryClass}>
            <div>
              <span className={receivableSummaryLabelClass}>سهم</span>
              <span>{formatMoney(item.share)}</span>
            </div>
            <div>
              <span className={receivableSummaryLabelClass}>پرداخت‌شده</span>
              <span className={receivablePaidClass}>{formatMoney(item.paid)}</span>
            </div>
            <div>
              <span className={receivableSummaryLabelClass}>مانده</span>
              <span className={complete ? receivableSettledClass : receivableRemainingClass}>
                {formatMoney(item.balance)}
              </span>
            </div>
          </div>

          {item.breakdown.length > 0 ? (
            <div className={receivablePaymentListClass}>
              <div className={receivablePaymentListTitleClass}>ریز اقلام</div>
              {item.breakdown.map(entry => (
                <div key={entry.expenseId} className={receivablePaymentItemClass}>
                  <div>
                    <span>{entry.expenseTitle}</span>
                    <span className={installmentDueClass}>
                      {entry.expenseDate ? formatIsoDatePersian(entry.expenseDate) : '—'} · کل:{' '}
                      {formatMoney(entry.expenseAmount)}
                    </span>
                  </div>
                  <span className={listCardAmountPillClass}>{formatMoney(entry.share)}</span>
                </div>
              ))}
            </div>
          ) : null}

          {item.share > 0 ? (
            <div className={receivableAddPaymentClass}>
              {showPaymentForm ? (
                <DangSplitPaymentForm
                  remaining={item.balance}
                  saving={saving}
                  onSubmit={onAddPayment}
                  onCancel={onClosePaymentForm}
                />
              ) : (
                <div className={receivableAddPaymentActionsClass}>
                  {complete ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={saving}
                      onClick={onUndoPayments}
                    >
                      لغو تسویه
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={saving}
                        onClick={onOpenPaymentForm}
                      >
                        + ثبت بخشی از پرداخت
                      </Button>
                      <Button
                        type="button"
                        variant="inflow"
                        size="sm"
                        disabled={saving}
                        loading={saving}
                        onClick={onSettleFull}
                      >
                        تسویه کامل
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </AccordionCollapse>
    </div>
  )
}
