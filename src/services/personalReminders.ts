import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow
} from './sheets'
import {
  PERSONAL_REMINDER_CATEGORIES,
  type PersonalReminder,
  type PersonalReminderCategory,
  type PersonalReminderRecurrence
} from '../types/personalReminders'
import { formatMoney } from '../utils/formatMoney'
import {
  addDaysToIso,
  addJalaliMonths,
  addJalaliYears,
  formatIsoDatePersian,
  getTodayIso,
  isoToJalali
} from '../utils/jalaliDate'

export const PERSONAL_REMINDERS_SHEET = 'مواعد_شخصی'

export const PERSONAL_REMINDERS_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'دسته‌بندی',
  'عنوان',
  'تاریخ',
  'تکرار',
  'مبلغ',
  'روز_قبل',
  'فعال'
]

const VALID_CATEGORIES = new Set(PERSONAL_REMINDER_CATEGORIES.map(item => item.value))
const VALID_RECURRENCE = new Set<PersonalReminderRecurrence>(['none', 'monthly', 'yearly'])

function parseBool(value: string | undefined): boolean {
  const v = String(value ?? '')
    .trim()
    .toLowerCase()

  return v === 'true' || v === '1' || v === 'بله' || v === 'yes'
}

function parseCategory(value: string): PersonalReminderCategory {
  const normalized = String(value ?? '').trim() as PersonalReminderCategory

  return VALID_CATEGORIES.has(normalized) ? normalized : 'other'
}

function parseRecurrence(value: string): PersonalReminderRecurrence {
  const normalized = String(value ?? '').trim() as PersonalReminderRecurrence

  return VALID_RECURRENCE.has(normalized) ? normalized : 'yearly'
}

function rowToPersonalReminder(
  row: string[],
  rowNumber: number
): (PersonalReminder & { rowNumber: number }) | null {
  const id = String(row[0] ?? '').trim()

  if (!id) return null

  return {
    rowNumber,
    id,
    createdAt: row[1] ?? '',
    category: parseCategory(row[2] ?? ''),
    title: row[3] ?? '',
    dueDate: row[4] ?? '',
    recurrence: parseRecurrence(row[5] ?? ''),
    amount: Number(row[6]) || 0,
    daysBefore: Math.max(0, Number(row[7]) || 0),
    enabled: parseBool(row[8])
  }
}

function personalReminderToRow(item: PersonalReminder): string[] {
  return [
    item.id,
    item.createdAt,
    item.category,
    item.title,
    item.dueDate,
    item.recurrence,
    String(item.amount || 0),
    String(item.daysBefore),
    item.enabled ? 'TRUE' : 'FALSE'
  ]
}

export function getPersonalReminderCategoryLabel(category: PersonalReminderCategory): string {
  return PERSONAL_REMINDER_CATEGORIES.find(item => item.value === category)?.label ?? 'سایر'
}

export function getPersonalReminderRecurrenceLabel(recurrence: PersonalReminderRecurrence): string {
  if (recurrence === 'monthly') return 'ماهانه'
  if (recurrence === 'yearly') return 'سالانه'

  return 'یک‌بار'
}

export function sortPersonalReminders<T extends PersonalReminder>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1

    return (a.dueDate || '').localeCompare(b.dueDate || '')
  })
}

export async function ensurePersonalRemindersSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, PERSONAL_REMINDERS_SHEET, PERSONAL_REMINDERS_HEADERS)
}

export async function fetchPersonalReminders(
  spreadsheetId: string
): Promise<(PersonalReminder & { rowNumber: number })[]> {
  await ensurePersonalRemindersSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, PERSONAL_REMINDERS_SHEET)

  return sortPersonalReminders(
    rows
      .map((row, index) => rowToPersonalReminder(row, index + 2))
      .filter((item): item is PersonalReminder & { rowNumber: number } => item != null)
  )
}

export async function createPersonalReminder(
  spreadsheetId: string,
  data: Omit<PersonalReminder, 'id' | 'createdAt'>
): Promise<PersonalReminder> {
  const item: PersonalReminder = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    ...data
  }

  await appendSheetRow(spreadsheetId, PERSONAL_REMINDERS_SHEET, personalReminderToRow(item))

  return item
}

export async function updatePersonalReminder(
  spreadsheetId: string,
  rowNumber: number,
  item: PersonalReminder
): Promise<void> {
  await updateSheetRow(
    spreadsheetId,
    PERSONAL_REMINDERS_SHEET,
    rowNumber,
    personalReminderToRow(item)
  )
}

export async function deletePersonalReminder(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, PERSONAL_REMINDERS_SHEET, rowNumber)
}

export function advancePersonalReminderDueDate(
  dueDate: string,
  recurrence: PersonalReminderRecurrence
): string | null {
  if (recurrence === 'yearly') return addJalaliYears(dueDate, 1)
  if (recurrence === 'monthly') {
    const { day } = isoToJalali(dueDate)

    return addJalaliMonths(dueDate, 1, day)
  }

  return null
}

export function getPersonalReminderCompletionMessage(
  recurrence: PersonalReminderRecurrence
): string {
  if (recurrence === 'yearly') {
    return 'با تأیید، موعد این یادآوری یک سال به جلو منتقل می‌شود.'
  }
  if (recurrence === 'monthly') {
    return 'با تأیید، موعد این یادآوری یک ماه به جلو منتقل می‌شود.'
  }

  return 'این یادآوری یک‌باره است و پس از تأیید غیرفعال می‌شود.'
}

export async function completePersonalReminder(
  spreadsheetId: string,
  item: PersonalReminder & { rowNumber: number }
): Promise<PersonalReminder> {
  const nextDueDate = advancePersonalReminderDueDate(item.dueDate, item.recurrence)

  const updated: PersonalReminder = {
    ...item,
    dueDate: nextDueDate ?? item.dueDate,
    enabled: nextDueDate != null
  }

  await updatePersonalReminder(spreadsheetId, item.rowNumber, updated)

  return updated
}

export interface UpcomingPersonalReminderPush {
  reference: string
  title: string
  body: string
}

export function getUpcomingPersonalReminderPushes(
  items: PersonalReminder[],
  todayIso = getTodayIso()
): UpcomingPersonalReminderPush[] {
  return items
    .filter(item => item.enabled)
    .filter(item => {
      const targetDueDate = addDaysToIso(todayIso, item.daysBefore).slice(0, 10)

      return item.dueDate.slice(0, 10) === targetDueDate
    })
    .map(item => {
      const categoryLabel = getPersonalReminderCategoryLabel(item.category)
      const title = item.title.trim() || categoryLabel
      const amountPart = item.amount > 0 ? ` (${formatMoney(item.amount)})` : ''
      const dueLabel = formatIsoDatePersian(item.dueDate)

      return {
        reference: `personal_${item.id}_${item.dueDate.slice(0, 10)}`,
        title: `یادآوری ${title}`,
        body: `${title} (${categoryLabel})${amountPart} — موعد: ${dueLabel}`
      }
    })
}

export async function previewPersonalReminderPushes(
  spreadsheetId: string
): Promise<UpcomingPersonalReminderPush[]> {
  const items = await fetchPersonalReminders(spreadsheetId)

  return getUpcomingPersonalReminderPushes(items)
}
