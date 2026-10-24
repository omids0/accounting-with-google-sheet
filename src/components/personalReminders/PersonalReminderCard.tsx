import { getPersonalReminderRecurrenceLabel } from '../../services/personalReminders'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { PersonalReminderWithRow } from './types'
import TapCheckbox from '../form/TapCheckbox'
import MoneyText from '../MoneyText'
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
  dangCardTitleClass
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
  const categoryLabel = item.category || '—'
  const recurrenceLabel = getPersonalReminderRecurrenceLabel(item.recurrence)
  const isDone = !item.enabled

  return (
    <div className={dangCardClass({ paid: isDone })} data-highlight-id={item.id}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <TapCheckbox
            checked={isDone}
            disabled={isDone || completing}
            aria-label={isDone ? `انجام شده: ${item.title}` : `ثبت انجام ${item.title}`}
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
                <span className={dangCardAmountClass}>
                  <MoneyText amount={item.amount} />
                </span>
              ) : null}
            </div>
            <div className={dangCardMetaClass}>
              {categoryLabel} · {recurrenceLabel}
              {item.daysBefore > 0
                ? ` · یادآوری ${item.daysBefore.toLocaleString('fa-IR')} روز قبل از موعد`
                : ''}
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
          <CardEditButton itemLabel={item.title} onClick={() => onEdit(item)} />
          <CardDeleteButton itemLabel={item.title} onClick={() => onDelete(item)} />
        </div>
      </div>
    </div>
  )
}
