import { vehicleHorizontalCardsContainerClass } from './vehicleCardStyles'
import VehicleTransactionCard from './VehicleTransactionCard'
import {
  buildVehicleExpenseTypeBreakdown,
  sumVehicleTransactionAmounts
} from '../../services/vehicleTransactions'
import type { VehicleTransactionItem } from '../../types/vehicles'
import { formatMoney } from '../../utils/formatMoney'
import CategoryBarChart from '../charts/CategoryBarChart'

type VehicleTransactionsSectionProps = {
  transactions: VehicleTransactionItem[]
  onDelete: (item: VehicleTransactionItem) => void
}

export default function VehicleTransactionsSection({
  transactions,
  onDelete
}: VehicleTransactionsSectionProps) {
  const totalAmount = sumVehicleTransactionAmounts(transactions)
  const breakdown = buildVehicleExpenseTypeBreakdown(transactions)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <span className="text-[0.88rem] text-muted">مجموع هزینه‌ها</span>
        <span className="text-[1rem] font-bold text-expense" dir="ltr">
          {formatMoney(totalAmount)}
        </span>
      </div>

      {breakdown.length > 0 ? (
        <CategoryBarChart title="تفکیک هزینه‌ها" data={breakdown} tone="expense" />
      ) : null}

      <div className={vehicleHorizontalCardsContainerClass}>
        {transactions.map(item => (
          <VehicleTransactionCard key={item.id} item={item} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}
