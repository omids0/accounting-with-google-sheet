import {
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
  appendSheetRow,
  deleteSheetRow
} from './sheets'
import type { PushSubscriptionRecord, ReminderKind, ReminderRule } from '../types'

export {
  formatInstallmentReminderMessage,
  getUpcomingInstallmentReminders,
  previewInstallmentReminders,
  type UpcomingDueDateReminder,
  type UpcomingInstallmentReminder
} from './reminderDueDates'

export const REMINDERS_SHEET = 'یادآوری'
export const PUSH_SUBS_SHEET = 'ناتیف'
export const REMINDER_LOG_SHEET = 'یادآوری_ثبت'

export const REMINDERS_HEADERS = ['نوع', 'فعال', 'روز_قبل', 'ساعت', 'دقیقه']
export const PUSH_SUBS_HEADERS = ['endpoint', 'p256dh', 'auth', 'دستگاه', 'زمان_ثبت']
export const REMINDER_LOG_HEADERS = ['تاریخ', 'نوع', 'مرجع', 'زمان_ارسال']

const VALID_KINDS: ReminderKind[] = ['installments', 'checks', 'dang', 'personal', 'daily']

const REMINDER_KIND_LABELS: Record<ReminderKind, string> = {
  installments: 'اقساط',
  checks: 'چک‌ها',
  dang: 'بدهی‌ها',
  personal: 'مواعد شخصی',
  daily: 'یادآوری روزانه'
}

const DUE_DATE_KINDS: ReminderKind[] = ['installments', 'checks', 'dang']

export const DEFAULT_RULES: ReminderRule[] = [
  { kind: 'installments', enabled: false, daysBefore: 1, hour: 9, minute: 0 },
  { kind: 'checks', enabled: false, daysBefore: 1, hour: 9, minute: 0 },
  { kind: 'dang', enabled: false, daysBefore: 1, hour: 9, minute: 0 },
  { kind: 'personal', enabled: false, daysBefore: 0, hour: 9, minute: 0 },
  { kind: 'daily', enabled: true, daysBefore: 0, hour: 9, minute: 0 }
]

function parseBool(value: string | undefined): boolean {
  const v = String(value ?? '')
    .trim()
    .toLowerCase()

  return v === 'true' || v === '1' || v === 'بله' || v === 'yes'
}

function isReminderKind(value: string): value is ReminderKind {
  return VALID_KINDS.includes(value as ReminderKind)
}

function rowToRule(row: string[]): ReminderRule | null {
  const kind = String(row[0] ?? '').trim()

  if (!isReminderKind(kind)) return null

  return {
    kind,
    enabled: parseBool(row[1]),
    daysBefore: Math.max(0, Number(row[2]) || 0),
    hour: Math.min(23, Math.max(0, Number(row[3]) || 9)),
    minute: Math.min(59, Math.max(0, Number(row[4]) || 0))
  }
}

function ruleToRow(rule: ReminderRule): string[] {
  return [
    rule.kind,
    rule.enabled ? 'TRUE' : 'FALSE',
    String(rule.daysBefore),
    String(rule.hour),
    String(rule.minute)
  ]
}

function rowToSubscription(row: string[]): PushSubscriptionRecord | null {
  const endpoint = String(row[0] ?? '').trim()
  const p256dh = String(row[1] ?? '').trim()
  const auth = String(row[2] ?? '').trim()

  if (!endpoint || !p256dh || !auth) return null

  return {
    endpoint,
    p256dh,
    auth,
    deviceLabel: String(row[3] ?? '').trim() || 'دستگاه',
    updatedAt: String(row[4] ?? '').trim()
  }
}

function subscriptionToRow(sub: PushSubscriptionRecord): string[] {
  return [sub.endpoint, sub.p256dh, sub.auth, sub.deviceLabel, sub.updatedAt]
}

export function getReminderKindLabel(kind: ReminderKind): string {
  return REMINDER_KIND_LABELS[kind]
}

export function isDueDateReminderKind(
  kind: ReminderKind
): kind is 'installments' | 'checks' | 'dang' {
  return DUE_DATE_KINDS.includes(kind)
}

export async function ensureReminderSheets(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, REMINDERS_SHEET, REMINDERS_HEADERS)
  await ensureSheetWithHeaders(spreadsheetId, PUSH_SUBS_SHEET, PUSH_SUBS_HEADERS)
  await ensureSheetWithHeaders(spreadsheetId, REMINDER_LOG_SHEET, REMINDER_LOG_HEADERS)
}

export async function fetchReminderRules(spreadsheetId: string): Promise<ReminderRule[]> {
  await ensureReminderSheets(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, REMINDERS_SHEET)
  const rules = rows.map(row => rowToRule(row)).filter((rule): rule is ReminderRule => rule != null)

  return DEFAULT_RULES.map(defaults => {
    const existing = rules.find(rule => rule.kind === defaults.kind)

    return existing ?? { ...defaults }
  })
}

export async function ensureDefaultReminderRules(spreadsheetId: string): Promise<void> {
  await ensureReminderSheets(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, REMINDERS_SHEET)
  const dailyRow = rows.find(row => String(row[0] ?? '').trim() === 'daily')

  if (dailyRow && parseBool(dailyRow[1])) return

  await saveReminderRules(spreadsheetId, [
    {
      kind: 'daily',
      enabled: true,
      daysBefore: 0,
      hour: Math.min(23, Math.max(0, Number(dailyRow?.[3]) || 9)),
      minute: Math.min(59, Math.max(0, Number(dailyRow?.[4]) || 0))
    }
  ])
}

export function formatDailyEngagementMessage(): { title: string; body: string } {
  return {
    title: 'حسابداری شخصی',
    body:
      'دیروز به اپ سر نزدید و ثبت مالی هم نداشتید. اگر چیزی از قلم افتاده، همین الان بیایید ' +
      'حساب\u200cوکتابتان را به\u200cروز کنید — دیر نشده!'
  }
}

export async function saveReminderRules(
  spreadsheetId: string,
  rules: ReminderRule[]
): Promise<void> {
  await ensureReminderSheets(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, REMINDERS_SHEET)
  const existingByKind = new Map<ReminderKind, number>()

  rows.forEach((row, index) => {
    const kind = String(row[0] ?? '').trim()

    if (isReminderKind(kind)) existingByKind.set(kind, index + 2)
  })

  for (const rule of rules) {
    const row = ruleToRow(rule)
    const rowNumber = existingByKind.get(rule.kind)

    if (rowNumber) {
      await updateSheetRow(spreadsheetId, REMINDERS_SHEET, rowNumber, row)
    } else {
      await appendSheetRow(spreadsheetId, REMINDERS_SHEET, row)
    }
  }
}

export async function fetchPushSubscriptions(
  spreadsheetId: string
): Promise<(PushSubscriptionRecord & { rowNumber: number })[]> {
  await ensureReminderSheets(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, PUSH_SUBS_SHEET)

  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .map(({ row, rowNumber }) => {
      const sub = rowToSubscription(row)

      return sub ? { ...sub, rowNumber } : null
    })
    .filter((item): item is PushSubscriptionRecord & { rowNumber: number } => item != null)
}

export async function upsertPushSubscription(
  spreadsheetId: string,
  subscription: PushSubscriptionRecord
): Promise<void> {
  await ensureReminderSheets(spreadsheetId)

  const existing = await fetchPushSubscriptions(spreadsheetId)
  const match = existing.find(item => item.endpoint === subscription.endpoint)
  const row = subscriptionToRow(subscription)

  if (match) {
    await updateSheetRow(spreadsheetId, PUSH_SUBS_SHEET, match.rowNumber, row)

    return
  }

  await appendSheetRow(spreadsheetId, PUSH_SUBS_SHEET, row)
}

export async function removePushSubscription(
  spreadsheetId: string,
  endpoint: string
): Promise<void> {
  const existing = await fetchPushSubscriptions(spreadsheetId)

  const match = existing.find(item => item.endpoint === endpoint)

  if (match) {
    await deleteSheetRow(spreadsheetId, PUSH_SUBS_SHEET, match.rowNumber)
  }
}

export { INSTALLMENTS_SHEET } from './installments'
