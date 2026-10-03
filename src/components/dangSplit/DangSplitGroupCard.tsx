import {
  dangSplitProgressClass,
  dangSplitStatLabelClass,
  dangSplitStatValueClass,
  dangSplitStatValueDangerClass,
  dangSplitStatValueSuccessClass,
  dangSplitStatsRowClass
} from './dangSplitStyles'
import type { DangSplitGroupListItem } from './types'
import { formatMoney } from '../../utils/formatMoney'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import ProgressBar from '../ProgressBar'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  dangCardBodyClass,
  dangCardClass,
  dangCardContentRowClass,
  dangCardHeaderClass,
  dangCardMetaClass,
  dangCardNoteClass,
  dangCardTapAreaClass,
  dangCardTitleClass
} from '../ui/featureCardStyles'

export default function DangSplitGroupCard({
  item,
  onOpen,
  onEdit,
  onDelete
}: {
  item: DangSplitGroupListItem
  onOpen: (item: DangSplitGroupListItem) => void
  onEdit: (item: DangSplitGroupListItem) => void
  onDelete: (item: DangSplitGroupListItem) => void
}) {
  const { summary } = item
  const settledRatio = summary.total > 0 ? (summary.covered / summary.total) * 100 : 0

  return (
    <div className={dangCardClass({ paid: summary.total > 0 && summary.debtTotal <= 0 })}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <div className={dangCardBodyClass}>
            <div
              className={dangCardTapAreaClass()}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(item)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpen(item)
                }
              }}
              aria-label={`مشاهده گروه ${item.title}`}
            >
              <div className={dangCardHeaderClass}>
                <span className={dangCardTitleClass}>{item.title || '—'}</span>
                <span className={dangSplitStatValueClass}>{formatMoney(summary.total)}</span>
              </div>

              {item.description ? <p className={dangCardNoteClass}>{item.description}</p> : null}

              <div className={dangCardMetaClass}>
                {summary.peopleCount.toLocaleString('fa-IR')} نفر ·{' '}
                {summary.expensesCount.toLocaleString('fa-IR')} قلم هزینه ·{' '}
                {summary.settledCount.toLocaleString('fa-IR')} تسویه‌شده
              </div>

              <div className={dangSplitStatsRowClass}>
                <span>
                  <span className={dangSplitStatLabelClass}>پرداخت‌شده: </span>
                  <span className={dangSplitStatValueSuccessClass}>
                    {formatMoney(summary.covered)}
                  </span>
                </span>
                <span>
                  <span className={dangSplitStatLabelClass}>مانده بدهکاران: </span>
                  <span className={dangSplitStatValueDangerClass}>
                    {formatMoney(summary.debtTotal)}
                  </span>
                </span>
              </div>

              {summary.total > 0 ? (
                <div className={dangSplitProgressClass}>
                  <ProgressBar value={settledRatio} aria-label="درصد تسویه گروه" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className={cardActionButtonsClass}>
          <CardEditButton onClick={() => onEdit(item)} />
          <CardDeleteButton onClick={() => onDelete(item)} />
        </div>
      </div>
    </div>
  )
}
