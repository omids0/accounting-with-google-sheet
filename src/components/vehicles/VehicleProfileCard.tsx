import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import IranPlateBadge, { isEmptyPlate } from './IranPlateBadge'
import type { VehicleProfileWithRow } from './types'
import {
  vehicleHorizontalCardActionsClass,
  vehicleProfileCardClass,
  vehicleProfileCardContentClass
} from './vehicleCardStyles'
import { cn } from '../../utils/cn'
import {
  cardHeaderWithEditClass,
  installmentHeaderClass,
  listCardSubtitleClass,
  listCardTitleClass,
  walletItemInfoClass
} from '../ui/featureCardStyles'

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
  const showPlate = !isEmptyPlate(item.plate)

  return (
    <div className={vehicleProfileCardClass}>
      <div className={cardHeaderWithEditClass}>
        <button
          type="button"
          className={cn('installment-header', installmentHeaderClass(), 'wallet-item-header')}
          onClick={() => onOpen(item)}
          aria-label={`مشاهده جزئیات ${title}`}
        >
          <div className={walletItemInfoClass}>
            <div className={vehicleProfileCardContentClass}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={listCardTitleClass}>{title}</span>
                {actionNeededCount > 0 ? (
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--color-expense)_14%,transparent)] px-2 py-0.5 text-[0.72rem] font-bold text-expense">
                    {actionNeededCount.toLocaleString('fa-IR')} اقدام
                  </span>
                ) : null}
              </div>

              {showPlate ? <IranPlateBadge value={item.plate} /> : null}

              <div className={listCardSubtitleClass}>
                کارکرد: {item.mileage.toLocaleString('fa-IR')} km
              </div>
            </div>
          </div>
        </button>

        <div
          className={vehicleHorizontalCardActionsClass}
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
