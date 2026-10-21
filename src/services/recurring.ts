import { EXPENSE_KIND_FIELD_ID, PAYER_FIELD_ID } from '../components/form/buildingFields'
import { SUBCATEGORY_FIELD_ID, WALLET_ACCOUNT_FIELD_ID } from '../components/form/fieldUtils'
import type { RecurringItem, RecurringMode } from '../types'
import { buildJalaliMonthKey, getJalaliMonthKey, parseJalaliMonthKey } from '../utils/dateRange'
import { daysInJalaliMonth, isoToJalali, jalaliToIso } from '../utils/jalaliDate'
import { normalizeDigits } from '../utils/normalizeDigits'
import { parseNumeric } from '../utils/parseNumeric'

/** Note of a record posted from the reminder card. */
export const RECURRING_NOTE = 'تکرار ماهانه'

/** Label (note) of a record the app posted by itself. */
export const RECURRING_AUTO_NOTE = 'تکراری'

/** The edit form's choice; «بدون تکرار» turns an existing item off. */
export type RecurringChoice = RecurringMode | 'none'

export const RECURRING_CHOICES: { id: RecurringChoice; title: string; hint?: string }[] = [
  {
    id: 'reminder',
    title: 'یادآوری + یک لمس',
    hint: 'اول هر ماه یادآوری می‌آید؛ با یک لمس ثبت می‌شود'
  },
  { id: 'auto', title: 'خودکار', hint: 'بدون پرسش ثبت می‌شود؛ تا ۵ ثانیه قابل بازگردانی' },
  { id: 'none', title: 'بدون تکرار' }
]

function clampDayOfMonth(raw: string | number | undefined): number {
  const day = Math.round(parseNumeric(raw))

  return Math.min(31, Math.max(1, day || 1))
}

/** `1405-7` / `۱۴۰۵-۰۷` → `1405-07`; anything else → ''. */
export function normalizeMonthKey(raw: string): string {
  const month = parseJalaliMonthKey(normalizeDigits(raw))

  return month ? buildJalaliMonthKey(month.year, month.month) : ''
}

/** The two building columns, only when set (a personal item has none). */
function buildingColumns(
  kind: unknown,
  payer: unknown
): Pick<RecurringItem, 'expenseKind' | 'payer'> {
  const expenseKind = String(kind ?? '').trim()

  const payerKey = String(payer ?? '').trim()

  return {
    ...(expenseKind ? { expenseKind } : {}),
    ...(payerKey ? { payer: payerKey } : {})
  }
}

export function rowToRecurring(row: string[]): RecurringItem | null {
  const id = String(row[0] ?? '').trim()
  const type = String(row[2] ?? '').trim()
  const amount = parseNumeric(row[6])

  if (!id || (type !== 'income' && type !== 'expense') || !(amount > 0)) return null

  return {
    id,
    createdAt: String(row[1] ?? ''),
    type,
    category: String(row[3] ?? '').trim(),
    subCategory: String(row[4] ?? '').trim(),
    accountId: String(row[5] ?? '').trim(),
    amount,
    title: String(row[7] ?? '').trim(),
    dayOfMonth: clampDayOfMonth(row[8]),
    mode: String(row[9] ?? '').trim() === 'auto' ? 'auto' : 'reminder',
    lastPosted: normalizeMonthKey(String(row[10] ?? '')),
    active: !['خیر', 'false', '0', 'no'].includes(
      String(row[11] ?? '')
        .trim()
        .toLowerCase()
    ),
    ...buildingColumns(row[12], row[13])
  }
}

export function recurringToRow(item: RecurringItem): string[] {
  return [
    item.id,
    item.createdAt,
    item.type,
    item.category,
    item.subCategory,
    item.accountId,
    String(item.amount),
    item.title,
    String(item.dayOfMonth),
    item.mode,
    item.lastPosted,
    item.active ? 'بله' : 'خیر',
    ...(item.expenseKind || item.payer ? [item.expenseKind ?? '', item.payer ?? ''] : [])
  ]
}

/** The item's day in `monthKey`; 29/30/31 fall back to the last day of a shorter month. */
export function recurringDueDate(
  item: Pick<RecurringItem, 'dayOfMonth'>,
  monthKey: string
): string {
  const month = parseJalaliMonthKey(monthKey)

  if (!month) return ''

  const day = Math.min(item.dayOfMonth, daysInJalaliMonth(month.year, month.month))

  return jalaliToIso(month.year, month.month, day)
}

/** Posted or skipped for `monthKey` already. */
export function isHandledFor(item: RecurringItem, monthKey: string): boolean {
  return !!item.lastPosted && item.lastPosted >= monthKey
}

/** The reminder card: from the 1st of the month until each item is posted or skipped. */
export function pendingReminders(items: RecurringItem[], todayIso: string): RecurringItem[] {
  const monthKey = getJalaliMonthKey(todayIso)

  return items.filter(
    item => item.active && item.mode === 'reminder' && !isHandledFor(item, monthKey)
  )
}

/** Auto items whose day has come this month and that were not posted yet. */
export function dueAutoItems(items: RecurringItem[], todayIso: string): RecurringItem[] {
  const monthKey = getJalaliMonthKey(todayIso)

  return items.filter(
    item =>
      item.active &&
      item.mode === 'auto' &&
      !isHandledFor(item, monthKey) &&
      recurringDueDate(item, monthKey) <= todayIso
  )
}

/** A reminder item posted early keeps today's date; later it keeps its own day. */
export function reminderPostDate(item: RecurringItem, todayIso: string): string {
  const due = recurringDueDate(item, getJalaliMonthKey(todayIso))

  return due && due < todayIso ? due : todayIso
}

/** «ثبت همه»: ticked items are posted, unticked ones are skipped for this month. */
export function planReminderPost(
  items: RecurringItem[],
  checkedIds: ReadonlySet<string>
): { post: RecurringItem[]; skip: RecurringItem[] } {
  return {
    post: items.filter(item => checkedIds.has(item.id)),
    skip: items.filter(item => !checkedIds.has(item.id))
  }
}

/**
 * Double-post guard for auto mode, against the row as Google Sheets has it now.
 * `conflict`: the row changed elsewhere (or is gone) since this device read it.
 */
export function planAutoPost(
  local: RecurringItem,
  fresh: RecurringItem | null,
  monthKey: string
): 'post' | 'skip' | 'conflict' {
  if (!fresh) return 'conflict'
  if (isHandledFor(fresh, monthKey)) return 'skip'
  if (recurringToRow(fresh).join('\u0001') !== recurringToRow(local).join('\u0001')) {
    return 'conflict'
  }

  return fresh.active && fresh.mode === 'auto' ? 'post' : 'skip'
}

/**
 * Bank SMS suggestion (round 6, Task E): an active item with this amount and wallet
 * account, or `null`.
 */
export function findRecurringMatch(
  amount: number,
  accountId: string,
  items: RecurringItem[]
): RecurringItem | null {
  return (
    items.find(item => item.active && item.amount === amount && item.accountId === accountId) ??
    null
  )
}

/** The item a record belongs to: same type, category, subcategory and account. */
export function findRecurringForRecord<T extends RecurringItem>(
  items: T[],
  type: string,
  values: Record<string, string | number>
): T | null {
  const same = items.filter(
    item =>
      item.type === type &&
      item.category === String(values.category ?? '') &&
      item.subCategory === String(values[SUBCATEGORY_FIELD_ID] ?? '') &&
      item.accountId === String(values[WALLET_ACCOUNT_FIELD_ID] ?? '')
  )

  return (
    same.find(item => item.title === String(values.title ?? '')) ??
    same.find(item => item.amount === parseNumeric(values.amount)) ??
    same[0] ??
    null
  )
}

/** A record the reminder card or auto mode posted. */
export function isRecurringBorn(values: Record<string, string | number>): boolean {
  const note = String(values.note ?? '').trim()

  return note === RECURRING_AUTO_NOTE || note.includes(RECURRING_NOTE)
}

/** A new item from a saved record: its day, and its month counts as handled. */
export function recurringFromRecord(
  type: RecurringItem['type'],
  values: Record<string, string | number>,
  dateIso: string,
  mode: RecurringMode,
  meta: { id: string; createdAt: string }
): RecurringItem {
  return {
    ...meta,
    type,
    category: String(values.category ?? ''),
    subCategory: String(values[SUBCATEGORY_FIELD_ID] ?? ''),
    accountId: String(values[WALLET_ACCOUNT_FIELD_ID] ?? ''),
    amount: parseNumeric(values.amount),
    title: String(values.title ?? ''),
    dayOfMonth: isoToJalali(dateIso).day,
    mode,
    lastPosted: getJalaliMonthKey(dateIso),
    active: true,
    ...buildingColumns(values[EXPENSE_KIND_FIELD_ID], values[PAYER_FIELD_ID])
  }
}

/** Form values of the record an item posts. */
export function recurringRecordValues(
  item: RecurringItem,
  dateFieldId: string,
  dateIso: string,
  note: string
): Record<string, string | number> {
  return {
    [dateFieldId]: dateIso,
    amount: item.amount,
    title: item.title || item.category,
    category: item.category,
    [SUBCATEGORY_FIELD_ID]: item.subCategory,
    [WALLET_ACCOUNT_FIELD_ID]: item.accountId,
    note,
    ...(item.expenseKind ? { [EXPENSE_KIND_FIELD_ID]: item.expenseKind } : {}),
    ...(item.payer ? { [PAYER_FIELD_ID]: item.payer } : {})
  }
}
