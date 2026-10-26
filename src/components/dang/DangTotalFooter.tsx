import type { DangWithRow } from './types'
import { dangRemaining, isDangSettled, unpaidDangTotal } from '../../utils/dangLedger'
import { distributionSparkline } from '../../utils/sparklineData'
import StatCard from '../StatCard'
import { dangTotalFooterClass } from '../ui/featureCardStyles'

/** The footer's label: the sum is over every debt, or only over the filtered ones. */
export function dangFooterLabel(filtered: boolean): string {
  return filtered ? 'مانده پرداخت نشده (فیلتر شده)' : 'مانده پرداخت نشده'
}

/**
 * «مانده پرداخت نشده»: what is still owed (the remaining of each debt, not its full amount).
 * A personal list always shows it and says «فیلتر شده» when a filter narrows the sum; a
 * building's list (its own chips narrow it) shows it only while something is owed.
 */
export default function DangTotalFooter({
  items,
  filteredItems,
  filtered,
  building
}: {
  items: DangWithRow[]
  filteredItems: DangWithRow[]
  /** A filter is applied (even one that happens to keep every row). */
  filtered: boolean
  building: boolean
}) {
  const showFiltered = !building && (filtered || filteredItems.length !== items.length)

  const total = unpaidDangTotal(filteredItems)

  if (building && total <= 0) return null

  return (
    <StatCard
      label={dangFooterLabel(showFiltered)}
      amount={total}
      variant="expense"
      wide
      sparklineData={distributionSparkline(
        filteredItems.filter(item => !isDangSettled(item)).map(item => dangRemaining(item))
      )}
      className={dangTotalFooterClass}
    />
  )
}
