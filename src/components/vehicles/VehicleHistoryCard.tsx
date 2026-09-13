import type { VehicleHistoryEntry } from '../../types/vehicles'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardDeleteButton from '../CardDeleteButton'
import {
  vehicleHorizontalCardActionsClass,
  vehicleHorizontalCardBodyClass,
  vehicleHorizontalCardClass,
  vehicleHorizontalCardHeaderClass
} from './vehicleCardStyles'
import { listCardSubtitleClass, listCardTitleClass } from '../ui/featureCardStyles'

type VehicleHistoryEntryWithRow = VehicleHistoryEntry & { rowNumber: number }

type VehicleHistoryCardProps = {
  item: VehicleHistoryEntryWithRow
  onDelete: (item: VehicleHistoryEntryWithRow) => void
}

const KIND_LABELS: Record<VehicleHistoryEntry['recordKind'], string> = {
  periodic: 'سرویس دوره‌ای',
  deadline: 'موعد',
  mechanic: 'مکانیک'
}

export default function VehicleHistoryCard({ item, onDelete }: VehicleHistoryCardProps) {
  return (
    <div className={vehicleHorizontalCardClass}>
      <div className={vehicleHorizontalCardHeaderClass}>
        <div className={vehicleHorizontalCardBodyClass}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={listCardTitleClass}>{KIND_LABELS[item.recordKind]}</span>
            {item.amount > 0 ? (
              <span className="text-[0.82rem] font-bold text-expense" dir="ltr">
                {formatMoney(item.amount)}
              </span>
            ) : null}
          </div>
          <div className={listCardSubtitleClass}>
            {item.date ? formatIsoDatePersian(item.date) : '—'}
            {item.mileage > 0 ? ` · ${item.mileage.toLocaleString('fa-IR')} km` : ''}
            {item.nextKm > 0 ? ` · بعدی: ${item.nextKm.toLocaleString('fa-IR')} km` : ''}
          </div>
          {item.details ? (
            <div className="mt-1 text-[0.8rem] text-muted">{item.details}</div>
          ) : null}
        </div>

        <div className={vehicleHorizontalCardActionsClass} role="group">
          <CardDeleteButton onClick={() => onDelete(item)} />
        </div>
      </div>
    </div>
  )
}
