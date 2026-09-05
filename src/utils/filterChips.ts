import type { FilterChip, FilterChipKind } from '../components/ActiveFilterChips'
import type { PaymentStatusFilter } from '../components/PageFilterPanel'

function withKind(kind: FilterChipKind, chip: Omit<FilterChip, 'kind'>): FilterChip {
  return { ...chip, kind }
}

export function buildSearchChip(
  query: string,
  onRemove: () => void,
  prefix = 'جستجو'
): FilterChip | null {
  const trimmed = query.trim()

  if (!trimmed) return null

  return withKind('search', {
    id: 'search',
    label: `${prefix}: ${trimmed}`,
    onRemove
  })
}

export function buildDateRangeChip(label: string, onRemove?: () => void): FilterChip {
  return withKind('date', {
    id: 'date-range',
    label,
    onRemove
  })
}

export function buildPaymentStatusChip(
  status: Exclude<PaymentStatusFilter, 'all'>,
  onRemove: () => void,
  labels?: { paid: string; unpaid: string }
): FilterChip {
  return withKind('payment', {
    id: 'payment-status',
    label: status === 'paid' ? labels?.paid ?? 'پرداخت شده' : labels?.unpaid ?? 'پرداخت نشده',
    onRemove
  })
}

export function buildCategoryChip(category: string, onRemove: () => void): FilterChip {
  return withKind('category', {
    id: 'category',
    label: `دسته: ${category}`,
    onRemove
  })
}

export function buildSortChip(label: string, onRemove: () => void): FilterChip {
  return withKind('sort', {
    id: 'sort',
    label: `مرتب‌سازی: ${label}`,
    onRemove
  })
}

export function compactFilterChips(
  chips: Array<FilterChip | null | undefined | false>
): FilterChip[] {
  return chips.filter((chip): chip is FilterChip => Boolean(chip))
}
