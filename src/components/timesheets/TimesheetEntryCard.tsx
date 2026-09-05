import { cn } from '../../utils/cn'
import { formatDateTimePersian, formatDurationFa } from '../../utils/datetime'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { TimesheetEntryWithRow } from './useTimesheetDetailPage'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  dangCardBodyClass,
  dangCardContentRowClass,
  dangCheckboxClass,
  installmentNoteClass,
  listCardAmountPillClass,
  listCardCheckboxShellClass,
  listCardSubtitleClass,
  listCardTitleClass
} from '../ui/featureCardStyles'
import { timesheetEntrySeparatorClass } from '../ui/toolsPageStyles'

interface TimesheetEntryCardProps {
  item: TimesheetEntryWithRow
  togglingCheckId: string
  onToggleChecked: (item: TimesheetEntryWithRow, checked: boolean) => void
  onEdit: (item: TimesheetEntryWithRow) => void
  onDelete: (item: TimesheetEntryWithRow) => void
}

export default function TimesheetEntryCard({
  item,
  togglingCheckId,
  onToggleChecked,
  onEdit,
  onDelete
}: TimesheetEntryCardProps) {
  return (
    <div className={cn(listCardCheckboxShellClass(), item.checked && 'opacity-[0.78]')}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <input
            type="checkbox"
            className={dangCheckboxClass}
            checked={item.checked}
            disabled={togglingCheckId === item.id}
            onChange={event => onToggleChecked(item, event.target.checked)}
            onClick={event => event.stopPropagation()}
            aria-label={`تایید ${item.title}`}
          />
          <div className={dangCardBodyClass}>
            <div className={listCardTitleClass}>{item.title}</div>
            <div className={listCardSubtitleClass}>
              {formatDateTimePersian(item.startAt)}
              <span className={timesheetEntrySeparatorClass}> · </span>
              {formatDateTimePersian(item.endAt)}
            </div>
            <div className={listCardSubtitleClass}>
              <span className={listCardAmountPillClass}>
                {formatDurationFa(item.durationMinutes)}
              </span>
            </div>
            {item.description && <p className={installmentNoteClass}>{item.description}</p>}
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
