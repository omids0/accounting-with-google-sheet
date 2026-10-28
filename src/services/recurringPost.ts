import { logItemActivity } from './activityLog'
import { getDateFieldId } from './dashboardAggregation'
import { settleEntryWallet } from './entryWallet'
import { refreshOpeningBalancesInBackground } from './openingBalanceRefresh'
import { loadRecordLedger } from './recordLedger'
import {
  dueAutoItems,
  isHandledFor,
  planAutoPost,
  planReminderPost,
  RECURRING_AUTO_NOTE,
  RECURRING_NOTE,
  recurringDueDate,
  recurringRecordValues,
  reminderPostDate
} from './recurring'
import { findExistingRecordForRecurring } from './recurringDuplicate'
import {
  fetchRecurringItems,
  fetchRemoteRecurringItems,
  recurringLockKey,
  saveRecurringItem,
  stripRow
} from './recurringSheet'
import { appendRecord } from './sheets'
import { isSharedWorkspace } from './workspace'
import { isNonFundPayer } from '../components/form/buildingFields'
import type { AppSettings, CustomForm, RecurringItem } from '../types'
import { getJalaliMonthKey } from '../utils/dateRange'
import { runSerial } from '../utils/serialQueue'

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

  // A building item paid by someone other than the fund leaves a debt to that person.
  if (form.type === 'expense' && isNonFundPayer(item.payer)) {
    await import('./buildingExpenseActions')
      .then(actions =>
        actions.syncBuildingExpense(spreadsheetId, recordId, values, getDateFieldId(form))
      )
      .catch(() => undefined)
  }

  return recordId
}

/**
 * The item's row as this device and Google Sheets hold it now, so a double tap, a second tab or a
 * second device cannot post it again. Handled on either side = handled. Offline the remote read
 * fails and the local copy decides alone; an item found nowhere falls back to the card's copy.
 */
function freshItem(
  item: RecurringItem,
  monthKey: string,
  remote: RecurringItem[],
  local: RecurringItem[]
): { row: RecurringItem; handled: boolean } {
  const rows = [local.find(row => row.id === item.id), remote.find(row => row.id === item.id)]

  return {
    row: rows[0] ?? rows[1] ?? item,
    handled: rows.some(row => !!row && (isHandledFor(row, monthKey) || !row.active))
  }
}

export interface ReminderPostOptions {
  /** Told for each item whose payment is already among the records: it is marked, not posted. */
  onDuplicate?: (item: RecurringItem) => void
}

/**
 * «ثبت همه» on the reminder card: ticked items get their record (note «تکرار ماهانه»),
 * unticked ones are skipped this month. «آخرین ثبت» is written before each record.
 * Calls run one at a time per book, and each item is re-read first: one already handled
 * (posted by an earlier tap or another device) is left alone. An item whose payment is already
 * a record (same amount and category within two days of its day, e.g. from a bank SMS) is marked
 * as posted without a second record. Returns how many records were written.
 */
export async function postReminderItems(
  settings: AppSettings,
  items: RecurringItem[],
  checkedIds: ReadonlySet<string>,
  todayIso: string,
  options: ReminderPostOptions = {}
): Promise<number> {
  // Nothing is automatic in a shared account (spec non-goals): its records need a payer and split.
  if (isSharedWorkspace(settings.spreadsheetId)) return 0

  return runSerial(recurringLockKey(settings.spreadsheetId), () =>
    postReminderLocked(settings, items, checkedIds, todayIso, options)
  )
}

async function postReminderLocked(
  settings: AppSettings,
  items: RecurringItem[],
  checkedIds: ReadonlySet<string>,
  todayIso: string,
  { onDuplicate }: ReminderPostOptions
): Promise<number> {
  const { spreadsheetId } = settings
  const monthKey = getJalaliMonthKey(todayIso)
  const { post, skip } = planReminderPost(items, checkedIds)
  const local = (await fetchRecurringItems(spreadsheetId)).map(stripRow)
  const remote = await fetchRemoteRecurringItems(spreadsheetId).catch(() => [])
  const ledger = post.length ? await loadRecordLedger(settings).catch(() => []) : []
  const usedRecordIds = new Set<string>()

  for (const item of skip) {
    const { row, handled } = freshItem(item, monthKey, remote, local)

    if (!handled) await saveRecurringItem(spreadsheetId, { ...row, lastPosted: monthKey })
  }

  const written: RecurringItem[] = []

  for (const item of post) {
    const form = recurringFormOf(settings, item.type)

    if (!form) continue

    const { row, handled } = freshItem(item, monthKey, remote, local)

    if (handled) continue
    await saveRecurringItem(spreadsheetId, { ...row, lastPosted: monthKey })

    const existing = findExistingRecordForRecurring(
      row,
      recurringDueDate(row, monthKey),
      ledger,
      usedRecordIds
    )

    if (existing) {
      if (existing.id) usedRecordIds.add(existing.id)
      onDuplicate?.(row)
      continue
    }

    await appendRecurringRecord(
      spreadsheetId,
      form,
      row,
      reminderPostDate(row, todayIso),
      RECURRING_NOTE
    )
    written.push(row)
  }

  if (written.length) refreshOpeningBalancesInBackground()
  logRecurringPosts(spreadsheetId, written)

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
  // No recurring posts in a shared account (spec non-goals): a post would have no payer or split.
  if (isSharedWorkspace(settings.spreadsheetId)) return []

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
