import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { VehicleProfileWithRow } from './types'
import {
  vehicleHorizontalCardActionsClass,
  vehicleHorizontalCardClass,
  vehicleHorizontalCardMainClass
} from './vehicleCardStyles'
import { cn } from '../../utils/cn'

type VehicleProfileCardProps = {
  item: VehicleProfileWithRow
  actionNeededCount: number
  onOpen: (item: VehicleProfileWithRow) => void
  onEdit: (item: VehicleProfileWithRow) => void
  onDelete: (item: VehicleProfileWithRow) => void
}

export default function VehicleProfileCard({
  item,
  actionNeededCount,
  onOpen,
  onEdit,
  onDelete
}: VehicleProfileCardProps) {
  const title = item.title || '—'
  const plateLabel = item.plate || '—'

  return (
    <div className={vehicleHorizontalCardClass}>
      <div
        className={cn(vehicleHorizontalCardMainClass, 'cursor-pointer')}
        role="button"
        tabIndex={0}
        onClick={() => onOpen(item)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen(item)
          }
        }}
        aria-label={`مشاهده جزئیات ${title}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.95rem] font-bold text-primary">{title}</span>
          {actionNeededCount > 0 ? (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--color-expense)_14%,transparent)] px-2 py-0.5 text-[0.72rem] font-bold text-expense">
              {actionNeededCount.toLocaleString('fa-IR')} اقدام
            </span>
          ) : null}
        </div>
        <div className="mt-1 text-[0.82rem] text-muted">
          کارکرد: {item.mileage.toLocaleString('fa-IR')} km · پلاک: {plateLabel}
        </div>
      </div>

      <div className={vehicleHorizontalCardActionsClass}>
        <CardEditButton onClick={() => onEdit(item)} />
        <CardDeleteButton onClick={() => onDelete(item)} />
      </div>
    </div>
  )
}
