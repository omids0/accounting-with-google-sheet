import {
  getPersonalReminderCategoryLabel,
  getPersonalReminderRecurrenceLabel
} from '../../services/personalReminders'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { PersonalReminderWithRow } from './types'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  dangCardAmountClass,
  dangCardBodyClass,
  dangCardClass,
  dangCardContentRowClass,
  dangCardDateClass,
  dangCardHeaderClass,
  dangCardMetaClass,
  dangCardTitleClass,
  dangCheckboxClass
} from '../ui/featureCardStyles'

type PersonalReminderCardProps = {
  item: PersonalReminderWithRow
  completing: boolean
  onComplete: (item: PersonalReminderWithRow) => void
  onEdit: (item: PersonalReminderWithRow) => void
  onDelete: (item: PersonalReminderWithRow) => void
}

export default function PersonalReminderCard({
  item,
  completing,
  onComplete,
  onEdit,
  onDelete
}: PersonalReminderCardProps) {
  const categoryLabel = getPersonalReminderCategoryLabel(item.category)
  const recurrenceLabel = getPersonalReminderRecurrenceLabel(item.recurrence)
  const isDone = !item.enabled

  return (
    <div className={dangCardClass({ paid: isDone })}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <input
            type="checkbox"
            className={dangCheckboxClass}
            checked={isDone}
            disabled={isDone || completing}
            aria-label={isDone ? 'انجام شده' : 'ثبت انجام یادآوری'}
            onChange={e => {
              if (item.enabled && e.target.checked) {
                onComplete(item)
              }
            }}
          />
          <div className={dangCardBodyClass}>
            <div className={dangCardHeaderClass}>
              <span className={dangCardTitleClass}>{item.title || '—'}</span>
              {item.amount > 0 ? (
                <span className={dangCardAmountClass} dir="ltr">
                  {formatMoney(item.amount)}
                </span>
              ) : null}
            </div>
            <div className={dangCardMetaClass}>
              {categoryLabel} · {recurrenceLabel}
              {item.daysBefore > 0 ? ` · ${item.daysBefore.toLocaleString('fa-IR')} روز قبل` : ''}
            </div>
            {item.dueDate ? (
              <div className={dangCardMetaClass}>
                <span className={dangCardDateClass}>
                  موعد: {formatIsoDatePersian(item.dueDate)}
                </span>
              </div>
            ) : null}
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
