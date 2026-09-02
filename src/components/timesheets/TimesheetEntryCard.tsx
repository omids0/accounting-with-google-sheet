import { formatDateTimePersian, formatDurationFa } from '../../utils/datetime'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { TimesheetEntryWithRow } from './useTimesheetDetailPage'

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
    <div
      className={`card installment-card timesheet-entry-card${
        item.checked ? ' timesheet-entry-card--checked' : ''
      }`}
    >
      <input
        type="checkbox"
        className="timesheet-entry-checkbox"
        checked={item.checked}
        disabled={togglingCheckId === item.id}
        onChange={event => onToggleChecked(item, event.target.checked)}
        aria-label={`تایید ${item.title}`}
      />
      <div className="timesheet-entry-body">
        <div className="card-header-with-edit">
          <div className="installment-header timesheet-entry-header">
            <div>
              <div className="list-card-title">{item.title}</div>
              <div className="list-card-subtitle">
                {formatDateTimePersian(item.startAt)}
                <span className="timesheet-entry-separator"> · </span>
                {formatDateTimePersian(item.endAt)}
              </div>
              <div className="list-card-subtitle">
                <span className="list-card-amount-pill">
                  {formatDurationFa(item.durationMinutes)}
                </span>
              </div>
              {item.description && <p className="installment-note">{item.description}</p>}
            </div>
          </div>
          <div className="card-action-buttons">
            <CardEditButton onClick={() => onEdit(item)} />
            <CardDeleteButton onClick={() => onDelete(item)} />
          </div>
        </div>
      </div>
    </div>
  )
}
