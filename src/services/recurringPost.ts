import { logItemActivity } from './activityLog'
import { getDateFieldId } from './dashboardAggregation'
import { settleEntryWallet } from './entryWallet'
import { refreshOpeningBalancesInBackground } from './openingBalanceRefresh'
import {
  dueAutoItems,
  planAutoPost,
  planReminderPost,
  RECURRING_AUTO_NOTE,
  RECURRING_NOTE,
  recurringDueDate,
  recurringRecordValues,
  reminderPostDate
} from './recurring'
import {
  fetchRecurringItems,
  fetchRemoteRecurringItems,
  saveRecurringItem,
  stripRow
} from './recurringSheet'
import { appendRecord } from './sheets'
import type { AppSettings, CustomForm, RecurringItem } from '../types'
import { getJalaliMonthKey } from '../utils/dateRange'

/** One feed line per run: the item's title, or «N تکرار ماهانه» for several. */
function logRecurringPosts(spreadsheetId: string, items: RecurringItem[]): void {
  const [first] = items

  if (!first) return
  logItemActivity(
    spreadsheetId,
    'recurring',
    'recurring',
    items.length === 1 ? first.id : '',
    first.title || first.category,
    { count: items.length }
  )
}

export function recurringFormOf(
  settings: AppSettings,
  type: RecurringItem['type']
): CustomForm | undefined {
  return settings.forms.find(form => form.type === type)
}

/** Appends the item's record for `dateIso` and moves its account balance. */
async function appendRecurringRecord(
  spreadsheetId: string,
  form: CustomForm,
  item: RecurringItem,
  dateIso: string,
  note: string
): Promise<string> {
  const recordId = crypto.randomUUID()
  const values = recurringRecordValues(item, getDateFieldId(form), dateIso, note)

  await appendRecord(spreadsheetId, form, recordId, new Date().toLocaleString('fa-IR'), values)
  await settleEntryWallet(spreadsheetId, form.type, values, undefined, recordId).catch(
    () => undefined
  )

  return recordId
}

/**
 * «ثبت همه» on the reminder card: ticked items get their record (note «تکرار ماهانه»),
 * unticked ones are skipped this month. «آخرین ثبت» is written before each record.
 * Returns how many records were written.
 */
export async function postReminderItems(
  settings: AppSettings,
  items: RecurringItem[],
  checkedIds: ReadonlySet<string>,
  todayIso: string
): Promise<number> {
  const monthKey = getJalaliMonthKey(todayIso)
  const { post, skip } = planReminderPost(items, checkedIds)

  for (const item of skip) {
    await saveRecurringItem(settings.spreadsheetId, { ...item, lastPosted: monthKey })
  }

  const written: RecurringItem[] = []

  for (const item of post) {
    const form = recurringFormOf(settings, item.type)

    if (!form) continue
    await saveRecurringItem(settings.spreadsheetId, { ...item, lastPosted: monthKey })
    await appendRecurringRecord(
      settings.spreadsheetId,
      form,
      item,
      reminderPostDate(item, todayIso),
      RECURRING_NOTE
    )
    written.push(item)
  }

  if (written.length) refreshOpeningBalancesInBackground()
  logRecurringPosts(settings.spreadsheetId, written)

  return written.length
}

export interface AutoPosted {
  item: RecurringItem
  form: CustomForm
  recordId: string
  /** «آخرین ثبت» before this post; undo puts it back. */
  previousLastPosted: string
}

/**
 * Auto mode on app open: each due item whose row on Google Sheets still matches this
 * device's copy is marked for this month first, then posted with note «تکراری».
 * A row changed elsewhere (another device posted, edited or deleted it) is left alone.
 * Throws only when the remote tab cannot be read (offline): nothing is posted then.
 */
export async function runAutoPost(settings: AppSettings, todayIso: string): Promise<AutoPosted[]> {
  const local = dueAutoItems(
    (await fetchRecurringItems(settings.spreadsheetId)).map(stripRow),
    todayIso
  )

  if (!local.length) return []

  const remote = await fetchRemoteRecurringItems(settings.spreadsheetId)
  const monthKey = getJalaliMonthKey(todayIso)
  const posted: AutoPosted[] = []

  for (const item of local) {
    const form = recurringFormOf(settings, item.type)
    const fresh = remote.find(row => row.id === item.id) ?? null

    if (!form || planAutoPost(item, fresh, monthKey) !== 'post') continue

    await saveRecurringItem(settings.spreadsheetId, { ...item, lastPosted: monthKey })

    const recordId = await appendRecurringRecord(
      settings.spreadsheetId,
      form,
      item,
      recurringDueDate(item, monthKey),
      RECURRING_AUTO_NOTE
    )

    posted.push({ item, form, recordId, previousLastPosted: item.lastPosted })
  }

  if (posted.length) refreshOpeningBalancesInBackground()
  logRecurringPosts(
    settings.spreadsheetId,
    posted.map(entry => entry.item)
  )

  return posted
}
