import type { Timesheet } from '../../types'
import { cn } from '../../utils/cn'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { TimesheetWithRow } from './useTimesheetsPage'
import { cardClassName } from '../ui/Card'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  installmentHeaderClass,
  listCardSubtitleClass,
  listCardTitleClass
} from '../ui/featureCardStyles'
import { timesheetListCardClass, timesheetListCardMainClass } from '../ui/toolsPageStyles'

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
      className={cardClassName(cn('installment-card interactive-card', timesheetListCardClass))}
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
      <div className={cardHeaderWithEditClass}>
        <div className={cn(installmentHeaderClass(), timesheetListCardMainClass)}>
          <div>
            <div className={listCardTitleClass}>{item.title}</div>
            {item.description && <div className={listCardSubtitleClass}>{item.description}</div>}
          </div>
        </div>
        <div
          className={cardActionButtonsClass}
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
