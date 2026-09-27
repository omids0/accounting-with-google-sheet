import {
  dangSplitStatLabelClass,
  dangSplitStatValueClass,
  dangSplitStatusClass
} from './dangSplitStyles'
import type { DangSplitPersonWithRow } from './types'
import type { DangSplitPersonSummary } from '../../types/dangSplit'
import { formatMoney } from '../../utils/formatMoney'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  dangCardBodyClass,
  dangCardClass,
  dangCardContentRowClass,
  dangCardHeaderClass,
  dangCardMetaClass,
  dangCardNoteClass,
  dangCardTitleClass
} from '../ui/featureCardStyles'

const STATUS_LABELS: Record<DangSplitPersonSummary['status'], string> = {
  settled: 'تسویه کامل',
  partial: 'پرداخت جزئی',
  unpaid: 'نپرداخته',
  creditor: 'طلبکار',
  none: 'بدون سهم'
}

export default function DangSplitPersonCard({
  item,
  summary,
  onEdit,
  onDelete
}: {
  item: DangSplitPersonWithRow
  summary?: DangSplitPersonSummary
  onEdit: (item: DangSplitPersonWithRow) => void
  onDelete: (item: DangSplitPersonWithRow) => void
}) {
  const share = summary?.share ?? 0
  const credit = summary?.credit ?? 0
  const balance = summary?.balance ?? 0
  const status = summary?.status ?? 'none'
  const balanceLabel = balance < 0 ? 'طلبکار' : balance > 0 ? 'بدهکار' : 'مانده'

  return (
    <div className={dangCardClass({ paid: status === 'settled' })}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <div className={dangCardBodyClass}>
            <div className={dangCardHeaderClass}>
              <span className={dangCardTitleClass}>{item.name || '—'}</span>
              <span className={dangSplitStatValueClass}>
                <span className={dangSplitStatLabelClass}>{balanceLabel}: </span>
                {formatMoney(Math.abs(balance))}
              </span>
            </div>
            <div className={dangCardMetaClass}>
              <span className={dangSplitStatusClass(status)}>{STATUS_LABELS[status]}</span>
              {' · '}
              <span className={dangSplitStatLabelClass}>سهم: </span>
              {formatMoney(share)}
              {' · '}
              <span className={dangSplitStatLabelClass}>بستانکاری: </span>
              {formatMoney(credit)}
            </div>
            <div className={dangCardMetaClass}>
              <span className={dangSplitStatLabelClass}>ضریب: </span>
              {item.defaultWeight.toLocaleString('fa-IR')}
              {item.deposit > 0 ? (
                <>
                  {' · '}
                  <span className={dangSplitStatLabelClass}>واریز به صندوق: </span>
                  {formatMoney(item.deposit)}
                </>
              ) : null}
            </div>
            {item.note ? <p className={dangCardNoteClass}>{item.note}</p> : null}
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
