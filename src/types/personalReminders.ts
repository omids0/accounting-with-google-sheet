export type PersonalReminderCategory = 'bill' | 'insurance' | 'tax' | 'subscription' | 'other'

export type PersonalReminderRecurrence = 'none' | 'monthly' | 'yearly'

export interface PersonalReminder {
  id: string
  createdAt: string
  category: PersonalReminderCategory
  note: string
  dueDate: string
  recurrence: PersonalReminderRecurrence
  amount: number
  daysBefore: number
  enabled: boolean
}

export const PERSONAL_REMINDER_CATEGORIES: {
  value: PersonalReminderCategory
  label: string
}[] = [
  { value: 'bill', label: 'قبض' },
  { value: 'insurance', label: 'بیمه' },
  { value: 'tax', label: 'مالیات' },
  { value: 'subscription', label: 'اشتراک' },
  { value: 'other', label: 'سایر' }
]

export const PERSONAL_REMINDER_RECURRENCE_OPTIONS: {
  value: PersonalReminderRecurrence
  label: string
}[] = [
  { value: 'none', label: 'یک‌بار' },
  { value: 'monthly', label: 'ماهانه' },
  { value: 'yearly', label: 'سالانه' }
]
