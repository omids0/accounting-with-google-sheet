import type { PersonalReminderWithRow } from './types'
import { useListFilters } from '../../hooks/useListFilters'

type UsePersonalRemindersFiltersOptions = {
  items: PersonalReminderWithRow[]
  categories: string[]
}

export function usePersonalRemindersFilters({
  items,
  categories
}: UsePersonalRemindersFiltersOptions) {
  return useListFilters({
    items,
    getSearchParts: item => [
      item.title,
      item.category,
      item.recurrence,
      item.amount,
      item.dueDate,
      item.daysBefore
    ],
    getDate: item => item.dueDate,
    getCategory: item => item.category,
    categorySeed: categories,
    isSettled: item => !item.enabled,
    paymentStatusLabels: { paid: 'غیرفعال', unpaid: 'فعال' }
  })
}
