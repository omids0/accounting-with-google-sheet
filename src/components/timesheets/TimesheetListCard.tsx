import type { Timesheet } from '../../types'
import { cn } from '../../utils/cn'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { TimesheetWithRow } from './useTimesheetsPage'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  installmentCardClass,
  installmentHeaderClass,
  listCardSubtitleClass,
  listCardTitleClass,
  walletItemCardClass,
  walletItemInfoClass
} from '../ui/featureCardStyles'

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
    <div className={cn(installmentCardClass({}), walletItemCardClass)}>
      <div className={cardHeaderWithEditClass}>
        <button
          type="button"
          className={cn(installmentHeaderClass(), 'wallet-item-header')}
          onClick={() => onOpen(item)}
        >
          <div className={walletItemInfoClass}>
            <div className={listCardTitleClass}>{item.title}</div>
            {item.description && <div className={listCardSubtitleClass}>{item.description}</div>}
          </div>
        </button>
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
