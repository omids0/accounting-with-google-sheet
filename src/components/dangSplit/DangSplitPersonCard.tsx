import { dangSplitStatLabelClass, dangSplitStatValueClass } from './dangSplitStyles'
import type { DangSplitPersonWithRow } from './types'
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

export default function DangSplitPersonCard({
  item,
  share,
  onEdit,
  onDelete
}: {
  item: DangSplitPersonWithRow
  share: number
  onEdit: (item: DangSplitPersonWithRow) => void
  onDelete: (item: DangSplitPersonWithRow) => void
}) {
  return (
    <div className={dangCardClass({})}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <div className={dangCardBodyClass}>
            <div className={dangCardHeaderClass}>
              <span className={dangCardTitleClass}>{item.name || '—'}</span>
              <span className={dangSplitStatValueClass}>{formatMoney(share)}</span>
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
