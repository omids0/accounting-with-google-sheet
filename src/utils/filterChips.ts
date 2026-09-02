import type { FilterChip } from '../components/ActiveFilterChips'
import type { PaymentStatusFilter } from '../components/PageFilterPanel'

export function buildSearchChip(
  query: string,
  onRemove: () => void,
  prefix = 'جستجو'
): FilterChip | null {
  const trimmed = query.trim()

  if (!trimmed) return null

  return {
    id: 'search',
    label: `${prefix}: ${trimmed}`,
    onRemove
  }
}

export function buildDateRangeChip(label: string, onRemove?: () => void): FilterChip {
  return {
    id: 'date-range',
    label,
    onRemove
  }
}

export function buildPaymentStatusChip(
  status: Exclude<PaymentStatusFilter, 'all'>,
  onRemove: () => void,
  labels?: { paid: string; unpaid: string }
): FilterChip {
  return {
    id: 'payment-status',
    label: status === 'paid' ? labels?.paid ?? 'پرداخت شده' : labels?.unpaid ?? 'پرداخت نشده',
    onRemove
  }
}

export function buildCategoryChip(category: string, onRemove: () => void): FilterChip {
  return {
    id: 'category',
    label: category,
    onRemove
  }
}

export function compactFilterChips(
  chips: Array<FilterChip | null | undefined | false>
): FilterChip[] {
  return chips.filter((chip): chip is FilterChip => Boolean(chip))
}
