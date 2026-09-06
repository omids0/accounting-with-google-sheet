export type PersonalReminderRecurrence = 'none' | 'monthly' | 'yearly'

export interface PersonalReminder {
  id: string
  createdAt: string
  category: string
  title: string
  dueDate: string
  recurrence: PersonalReminderRecurrence
  amount: number
  daysBefore: number
  enabled: boolean
}

export const PERSONAL_REMINDER_RECURRENCE_OPTIONS: {
  value: PersonalReminderRecurrence
  label: string
}[] = [
  { value: 'none', label: 'یک‌بار' },
  { value: 'monthly', label: 'ماهانه' },
  { value: 'yearly', label: 'سالانه' }
]
