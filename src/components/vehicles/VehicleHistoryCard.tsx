import type { VehicleHistoryEntry } from '../../types/vehicles'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardDeleteButton from '../CardDeleteButton'
import { vehicleHorizontalCardClass } from './vehicleCardStyles'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  dangCardBodyClass,
  dangCardContentRowClass,
  dangCardMetaClass,
  listCardTitleClass
} from '../ui/featureCardStyles'

type VehicleHistoryEntryWithRow = VehicleHistoryEntry & { rowNumber: number }

type VehicleHistoryCardProps = {
  item: VehicleHistoryEntryWithRow
  onDelete: (item: VehicleHistoryEntryWithRow) => void
}

const KIND_LABELS: Record<VehicleHistoryEntry['recordKind'], string> = {
  periodic: 'سرویس دوره‌ای',
  deadline: 'موعد',
  mechanic: 'مکانیک',
  mileage: 'ثبت کارکرد'
}

export default function VehicleHistoryCard({ item, onDelete }: VehicleHistoryCardProps) {
  return (
    <div className={vehicleHorizontalCardClass}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <div className={dangCardBodyClass}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={listCardTitleClass}>{KIND_LABELS[item.recordKind]}</span>
              {item.amount > 0 ? (
                <span className="text-[0.82rem] font-bold text-expense" dir="ltr">
                  {formatMoney(item.amount)}
                </span>
              ) : null}
            </div>
            <div className={dangCardMetaClass}>
              {item.date ? formatIsoDatePersian(item.date) : '—'}
              {item.mileage > 0 ? ` · ${item.mileage.toLocaleString('fa-IR')} km` : ''}
              {item.nextKm > 0 ? ` · بعدی: ${item.nextKm.toLocaleString('fa-IR')} km` : ''}
            </div>
            {item.details ? (
              <div className="mt-1 text-[0.76rem] leading-[1.4] text-muted">{item.details}</div>
            ) : null}
          </div>
        </div>

        <div className={cardActionButtonsClass} role="group">
          <CardDeleteButton onClick={() => onDelete(item)} />
        </div>
      </div>
    </div>
  )
}
