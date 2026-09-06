import type { PersonalReminder, PersonalReminderRecurrence } from '../../types/personalReminders'

export type PersonalReminderWithRow = PersonalReminder & { rowNumber: number }

export type PersonalReminderFormState = {
  title: string
  category: string
  dueDate: string
  recurrence: PersonalReminderRecurrence
  amount: number | ''
  daysBefore: number
  enabled: boolean
}

export type PersonalRemindersPageProps = {
  active?: boolean
}
