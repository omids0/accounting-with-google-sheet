import type { Timesheet } from '../../types'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { TimesheetWithRow } from './useTimesheetsPage'

interface TimesheetListCardProps {
  item: TimesheetWithRow
  onOpen: (timesheet: Timesheet) => void
  onEdit: (item: TimesheetWithRow) => void
  onDelete: (item: TimesheetWithRow) => void
}

export default function TimesheetListCard({
  item,
  onOpen,
  onEdit,
  onDelete
}: TimesheetListCardProps) {
  return (
    <div
      className="card installment-card interactive-card timesheet-list-card"
      role="button"
      tabIndex={0}
      aria-label={`مشاهده رکوردهای ${item.title}`}
      onClick={() => onOpen(item)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(item)
        }
      }}
    >
      <div className="card-header-with-edit">
        <div className="installment-header timesheet-list-card-main">
          <div>
            <div className="list-card-title">{item.title}</div>
            {item.description && <div className="list-card-subtitle">{item.description}</div>}
          </div>
        </div>
        <div
          className="card-action-buttons"
          role="group"
          onPointerDown={event => event.stopPropagation()}
        >
          <CardEditButton
            onClick={event => {
              event.stopPropagation()
              onEdit(item)
            }}
          />
          <CardDeleteButton
            onClick={event => {
              event.stopPropagation()
              onDelete(item)
            }}
          />
        </div>
      </div>
    </div>
  )
}
