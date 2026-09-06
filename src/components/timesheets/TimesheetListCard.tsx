import type { Timesheet } from '../../types'
import { cn } from '../../utils/cn'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { TimesheetWithRow } from './useTimesheetsPage'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  installmentCardClass,
  installmentChevronClass,
  installmentHeaderClass,
  listCardSubtitleClass,
  listCardTitleClass,
  walletItemCardClass,
  walletItemInfoClass,
  walletItemNoteClass,
  walletItemTitleRowClass
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
          className={cn('installment-header', installmentHeaderClass(), 'wallet-item-header')}
          onClick={() => onOpen(item)}
        >
          <div className={walletItemInfoClass}>
            <div className={walletItemTitleRowClass}>
              <div className={listCardTitleClass}>{item.title}</div>
              <span
                className={cn(installmentChevronClass, 'rotate-90 text-primary/70')}
                aria-hidden
              >
                ▼
              </span>
            </div>
            {item.description ? (
              <div className={cn(walletItemNoteClass, listCardSubtitleClass)}>
                {item.description}
              </div>
            ) : null}
            {item.createdAt ? (
              <div className={listCardSubtitleClass}>ایجاد: {item.createdAt}</div>
            ) : null}
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
