import {
  dangSplitChipClass,
  dangSplitChipsRowClass,
  dangSplitStatValueClass
} from './dangSplitStyles'
import type { DangSplitExpenseWithRow, DangSplitPersonWithRow } from './types'
import type { DangSplitAllocationWithRow } from '../../services/dangSplitExpenses'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import Button from '../ui/Button'
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

export default function DangSplitExpenseCard({
  item,
  allocations,
  peopleById,
  onAllocate,
  onEdit,
  onDelete
}: {
  item: DangSplitExpenseWithRow
  allocations: DangSplitAllocationWithRow[]
  peopleById: Map<string, DangSplitPersonWithRow>
  onAllocate: (item: DangSplitExpenseWithRow) => void
  onEdit: (item: DangSplitExpenseWithRow) => void
  onDelete: (item: DangSplitExpenseWithRow) => void
}) {
  const names = allocations
    .map(allocation => peopleById.get(allocation.personId)?.name)
    .filter((name): name is string => Boolean(name))

  return (
    <div className={dangCardClass({})}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <div className={dangCardBodyClass}>
            <div className={dangCardHeaderClass}>
              <span className={dangCardTitleClass}>{item.title || '—'}</span>
              <span className={dangSplitStatValueClass}>{formatMoney(item.amount)}</span>
            </div>

            <div className={dangCardMetaClass}>
              {item.date ? formatIsoDatePersian(item.date) : '—'} ·{' '}
              {names.length === 0 ? 'بدون تخصیص' : `${names.length.toLocaleString('fa-IR')} نفر`}
            </div>

            {item.note ? <p className={dangCardNoteClass}>{item.note}</p> : null}

            {names.length > 0 ? (
              <div className={dangSplitChipsRowClass}>
                {names.map(name => (
                  <span key={name} className={dangSplitChipClass}>
                    {name}
                  </span>
                ))}
              </div>
            ) : null}

            <div className={dangSplitChipsRowClass}>
              <Button type="button" variant="secondary" size="sm" onClick={() => onAllocate(item)}>
                تخصیص افراد
              </Button>
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
