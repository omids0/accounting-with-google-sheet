import type {
  PersonalReminder,
  PersonalReminderCategory,
  PersonalReminderRecurrence
} from '../../types/personalReminders'

export type PersonalReminderWithRow = PersonalReminder & { rowNumber: number }

export type PersonalReminderFormState = {
  title: string
  category: PersonalReminderCategory | ''
  dueDate: string
  recurrence: PersonalReminderRecurrence
  amount: number | ''
  daysBefore: number
  enabled: boolean
}

export type PersonalRemindersPageProps = {
  active?: boolean
}
