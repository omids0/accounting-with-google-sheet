import type { PersonalReminderWithRow } from './types'
import { useListFilters } from '../../hooks/useListFilters'
import { getPersonalReminderCategoryLabel } from '../../services/personalReminders'
import { PERSONAL_REMINDER_CATEGORIES } from '../../types/personalReminders'

type UsePersonalRemindersFiltersOptions = {
  items: PersonalReminderWithRow[]
}

export function usePersonalRemindersFilters({ items }: UsePersonalRemindersFiltersOptions) {
  return useListFilters({
    items,
    getSearchParts: item => [
      item.title,
      getPersonalReminderCategoryLabel(item.category),
      item.recurrence,
      item.amount,
      item.dueDate,
      item.daysBefore
    ],
    getDate: item => item.dueDate,
    getCategory: item => getPersonalReminderCategoryLabel(item.category),
    categorySeed: PERSONAL_REMINDER_CATEGORIES.map(entry => entry.label),
    isSettled: item => !item.enabled,
    paymentStatusLabels: { paid: 'غیرفعال', unpaid: 'فعال' }
  })
}
