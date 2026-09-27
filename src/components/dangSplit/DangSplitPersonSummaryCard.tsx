import {
  dangSplitBreakdownClass,
  dangSplitBreakdownRowClass,
  dangSplitStatLabelClass,
  dangSplitStatValueClass,
  dangSplitStatValueDangerClass,
  dangSplitStatValueSuccessClass,
  dangSplitStatsRowClass,
  dangSplitStatusClass
} from './dangSplitStyles'
import type { DangSplitPersonSummary } from '../../types/dangSplit'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardInlineAmountEdit from '../CardInlineAmountEdit'
import {
  dangCardBodyClass,
  dangCardClass,
  dangCardContentRowClass,
  dangCardHeaderClass,
  dangCardMetaClass,
  dangCardTapAreaClass,
  dangCardTitleClass
} from '../ui/featureCardStyles'

const STATUS_LABELS: Record<DangSplitPersonSummary['status'], string> = {
  settled: 'تسویه کامل',
  partial: 'پرداخت جزئی',
  unpaid: 'نپرداخته',
  none: 'بدون سهم'
}

export default function DangSplitPersonSummaryCard({
  item,
  categoryTitle,
  expanded,
  paidValue,
  saving,
  onExpand,
  onPaidChange,
  onPaidBlur
}: {
  item: DangSplitPersonSummary
  categoryTitle: string
  expanded: boolean
  paidValue: number | ''
  saving: boolean
  onExpand: (personId: string | null) => void
  onPaidChange: (value: number | '') => void
  onPaidBlur: () => void
}) {
  return (
    <div className={dangCardClass({ paid: item.status === 'settled', expanded })}>
      <div className={dangCardContentRowClass}>
        <div className={dangCardBodyClass}>
          <div
            className={dangCardTapAreaClass(expanded)}
            role="button"
            tabIndex={0}
            onClick={() => onExpand(expanded ? null : item.personId)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onExpand(expanded ? null : item.personId)
              }
            }}
            aria-expanded={expanded}
            aria-label={`جزئیات سهم ${item.name}`}
          >
            <div className={dangCardHeaderClass}>
              <span className={dangCardTitleClass}>{item.name || '—'}</span>
              <span className={dangSplitStatValueClass}>{formatMoney(item.share)}</span>
            </div>

            <div className={dangCardMetaClass}>
              {categoryTitle ? `${categoryTitle} · ` : ''}
              <span className={dangSplitStatusClass(item.status)}>
                {STATUS_LABELS[item.status]}
              </span>
            </div>

            <div className={dangSplitStatsRowClass}>
              <span>
                <span className={dangSplitStatLabelClass}>پرداخت‌شده: </span>
                <span className={dangSplitStatValueSuccessClass}>{formatMoney(item.paid)}</span>
              </span>
              <span>
                <span className={dangSplitStatLabelClass}>مانده: </span>
                <span className={dangSplitStatValueDangerClass}>{formatMoney(item.balance)}</span>
              </span>
            </div>

            {expanded && item.breakdown.length > 0 ? (
              <div className={dangSplitBreakdownClass}>
                {item.breakdown.map(entry => (
                  <div key={entry.expenseId} className={dangSplitBreakdownRowClass}>
                    <span>
                      {entry.expenseTitle}
                      {entry.expenseDate ? ` · ${formatIsoDatePersian(entry.expenseDate)}` : ''}
                    </span>
                    <span className={dangSplitStatValueClass}>
                      {formatMoney(entry.share)}
                      <span className={dangSplitStatLabelClass}>
                        {' '}
                        از {formatMoney(entry.expenseAmount)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {expanded ? (
            <CardInlineAmountEdit
              label="مبلغ پرداخت‌شده"
              value={paidValue}
              saving={saving}
              onChange={onPaidChange}
              onBlur={onPaidBlur}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
