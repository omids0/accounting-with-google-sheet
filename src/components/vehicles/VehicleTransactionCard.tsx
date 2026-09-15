import type { VehicleTransactionItem } from '../../types/vehicles'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { isFuelExpenseType } from '../../utils/vehicleExpenseUtils'
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

const SOURCE_LABELS: Record<VehicleTransactionItem['source'], string> = {
  expense: 'هزینه',
  periodic: 'سرویس',
  deadline: 'موعد',
  mechanic: 'مکانیک',
  history: 'تاریخچه'
}

type VehicleTransactionCardProps = {
  item: VehicleTransactionItem
  onDelete?: (item: VehicleTransactionItem) => void
}

export default function VehicleTransactionCard({ item, onDelete }: VehicleTransactionCardProps) {
  const isFuel = isFuelExpenseType(item.expenseType ?? '')

  return (
    <div className={vehicleHorizontalCardClass}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <div className={dangCardBodyClass}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={listCardTitleClass}>{item.title}</span>
              <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[0.68rem] text-muted">
                {SOURCE_LABELS[item.source]}
              </span>
              {item.amount > 0 ? (
                <span className="text-[0.82rem] font-bold text-expense" dir="ltr">
                  {formatMoney(item.amount)}
                </span>
              ) : null}
            </div>
            <div className={dangCardMetaClass}>
              {item.date ? formatIsoDatePersian(item.date) : '—'}
              {item.mileage ? ` · ${item.mileage.toLocaleString('fa-IR')} km` : ''}
              {isFuel && item.fuelLiters
                ? ` · ${item.fuelLiters.toLocaleString('fa-IR', { maximumFractionDigits: 2 })} L`
                : ''}
              {isFuel && item.fuelPricePerLiter
                ? ` · ${item.fuelPricePerLiter.toLocaleString('fa-IR')} تومان/L`
                : ''}
            </div>
          </div>
        </div>

        {onDelete && item.source === 'expense' ? (
          <div className={cardActionButtonsClass} role="group">
            <CardDeleteButton onClick={() => onDelete(item)} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
