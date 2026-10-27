import { applyBalance } from './bankSmsApplyBalance'
import { rememberSmsRecord } from './bankSmsCoverageStore'
import { smsRecordDate } from './bankSmsDate'
import { markBankSmsHandled } from './bankSmsNative'
import { SMS_RECORD_NOTE } from './bankSmsNote'
import { getBankSmsPrefs, learnSmsRef, updateBankSmsPrefs } from './bankSmsPrefs'
import { type ConfirmableSms } from './bankSmsQueue'
import { QueueNotLeftError } from './bankSmsQueueError'
import { liveRecordOfSms } from './bankSmsRecordOf'
import { smsSenderKey, type SmsCategoryChoice } from './bankSmsSuggest'
import { createLinkedExpenseRecord, createLinkedIncomeRecord } from './paymentTransactions'
import {
  applyWalletChanges,
  logUnappliedRecord,
  recordLedgerContext,
  type RecordWalletEffect
} from './recordWallet'
import { type LedgerContext } from './walletLedger'
import { WALLET_APPLY_NO } from '../components/form/fieldUtils'

export { isConfirmable, type ConfirmableSms } from './bankSmsQueue'

export interface SmsRecordInput {
  title: string
  category: string
  subCategory: string
}

export { SMS_RECORD_NOTE }

/**
 * A newer «مانده» of this account already includes the SMS. Then the balance does not
 * move, and the record is saved with «اثر بر موجودی» = خیر (deleting it later must not
 * undo an amount that was never applied).
 */
export function smsAlreadyInBalance(entry: ConfirmableSms, accountId: string): boolean {
  const anchor = getBankSmsPrefs().balanceStates[accountId]?.anchor

  return (
    accountId === entry.result.accountId && anchor !== undefined && entry.sms.receivedAt < anchor
  )
}

/** The record's type agrees with the SMS (expense ↔ debit). */
function sameDirection(entry: ConfirmableSms, effect: RecordWalletEffect): boolean {
  return effect.delta < 0 === (entry.result.direction === 'debit')
}

/**
 * Takes the SMS out of the queue once its record exists. A failure of the native side must not stop
 * the steps after it (balance, ledger, debt link): it comes back as a value, and the caller throws
 * `QueueNotLeftError` when those are done. A retry finds the record by `recordOfSms`.
 */
export async function leaveQueueAfterRecord(ids: string[]): Promise<Error | null> {
  try {
    await markBankSmsHandled(ids)

    return null
  } catch {
    return new QueueNotLeftError()
  }
}

/**
 * Confirm one SMS: write the income/expense record (unless `record` is null,
 * i.e. «فقط به‌روزرسانی موجودی»), move the account balance, drop it from the queue.
 * Resolves with the id of the record written ('' without one). `remember: false` keeps the
 * category out of the per-sender memory (a building's charge category must not be suggested
 * for the same bank in a personal workspace). `afterRecord` runs right after the record exists
 * and the SMS left the queue (before the balance step, which may fail): the debt/receivable link.
 */
export async function confirmSmsEntryWithId(
  spreadsheetId: string,
  entry: ConfirmableSms,
  record: SmsRecordInput | null,
  {
    remember = true,
    afterRecord
  }: { remember?: boolean; afterRecord?: (recordId: string) => Promise<void> } = {}
): Promise<string> {
  let recordId = ''
  let queueError: Error | null = null

  if (record) {
    const earlier = await liveRecordOfSms(
      spreadsheetId,
      entry.sms.id,
      entry.result.direction === 'debit' ? 'expense' : 'income'
    )

    // A save that failed after its record was written: finish it (leave the queue), no second record.
    if (earlier) {
      await markBankSmsHandled([entry.sms.id])

      return earlier
    }

    const params = {
      title: record.title,
      amount: entry.amount,
      category: record.category,
      subCategory: record.subCategory,
      note: SMS_RECORD_NOTE,
      date: smsRecordDate(entry.sms.body, entry.sms.receivedAt),
      // Ties the record to the account, so editing or deleting it later fixes the balance —
      // unless a newer «مانده» already holds it; then it must never move the balance.
      walletAccount: entry.result.accountId,
      walletApply: smsAlreadyInBalance(entry, entry.result.accountId) ? WALLET_APPLY_NO : ''
    }
    const type = entry.result.direction === 'debit' ? 'expense' : 'income'

    recordId =
      type === 'expense'
        ? await createLinkedExpenseRecord(spreadsheetId, params)
        : await createLinkedIncomeRecord(spreadsheetId, params)

    // The SMS already covers the record it created: no later SMS is taken for a payment of it.
    rememberSmsRecord(entry, recordId)
    // Leave the queue right after the record exists, so a failure below can never lead to the same
    // record being written twice; the steps below still run if the native side fails.
    queueError = await leaveQueueAfterRecord([entry.sms.id])
    if (remember) rememberSmsCategory(entry, type, record)
    await logUnappliedRecord(
      spreadsheetId,
      type,
      params,
      recordLedgerContext(params, 'پیامک', recordId)
    ).catch(() => undefined)
    await afterRecord?.(recordId)
  }

  if (!record) await markBankSmsHandled([entry.sms.id])
  // A balance-only confirm already ends with its own «موجودی به‌روز شد» toast: no second one.
  await applyBalance(spreadsheetId, entry, { title: record?.title, recordId, quiet: !record })
  if (queueError) throw queueError

  return recordId
}

/** The record just written from an SMS, as the payment of a debt or receivable: id, amount, date. */
export function smsLinkedRecord(entry: ConfirmableSms, recordId: string) {
  return {
    recordId,
    amount: entry.amount,
    date: smsRecordDate(entry.sms.body, entry.sms.receivedAt)
  }
}

export async function confirmSmsEntry(
  spreadsheetId: string,
  entry: ConfirmableSms,
  record: SmsRecordInput | null
): Promise<void> {
  await confirmSmsEntryWithId(spreadsheetId, entry, record)
}

/** Own-account transfer: both balances move, no income or expense is recorded. */
export async function confirmSmsTransfer(
  spreadsheetId: string,
  debit: ConfirmableSms,
  credit: ConfirmableSms
): Promise<void> {
  await markBankSmsHandled([debit.sms.id, credit.sms.id])
  const note = { title: 'انتقال بین حساب‌ها' }

  await applyBalance(spreadsheetId, debit, note)
  await applyBalance(spreadsheetId, credit, note)
}

export async function dismissSms(ids: string[]): Promise<void> {
  await markBankSmsHandled(ids)
}

/** The record saved straight from a card: its category and, when known, title. */
export function suggestedSmsRecord(
  choice: SmsCategoryChoice & { title?: string },
  accountTitle: string
): SmsRecordInput {
  return {
    title: choice.title || `${accountTitle} — پیامک`,
    category: choice.category,
    subCategory: choice.subCategory
  }
}

/** The next SMS from this template and sender suggests the same category. */
function rememberSmsCategory(
  entry: ConfirmableSms,
  type: 'income' | 'expense',
  record: SmsCategoryChoice
): void {
  const prefs = getBankSmsPrefs()
  const choice = { category: record.category, subCategory: record.subCategory }
  const senderKey = smsSenderKey(entry.sms.sender, type)

  updateBankSmsPrefs({
    lastCategory: { ...prefs.lastCategory, [entry.result.templateId]: choice },
    lastCategoryBySender: senderKey
      ? { ...prefs.lastCategoryBySender, [senderKey]: choice }
      : prefs.lastCategoryBySender
  })
}

/**
 * After the user saved the record from the normal entry form (opened from an SMS card):
 * drop the SMS from the queue and move the balance. Same account as the SMS → the SMS
 * «مانده» rule; another account → plain add/subtract, and its digits are learned for it.
 */
export async function settleSmsFromEntry(
  spreadsheetId: string,
  entry: ConfirmableSms,
  effect: RecordWalletEffect | null,
  record: Pick<SmsRecordInput, 'category' | 'subCategory'>,
  context: LedgerContext
): Promise<void> {
  rememberSmsRecord(entry, context.recordId ?? '')

  const queueError = await leaveQueueAfterRecord([entry.sms.id])

  const smsType = entry.result.direction === 'debit' ? 'expense' : 'income'

  rememberSmsCategory(entry, effect ? (effect.delta < 0 ? 'expense' : 'income') : smsType, record)

  // Same account and same direction as the SMS: follow its «مانده». Otherwise (another
  // account, or the user switched income/expense) the record's own effect applies.
  if (effect && effect.accountId === entry.result.accountId && sameDirection(entry, effect)) {
    await applyBalance(spreadsheetId, { ...entry, amount: Math.abs(effect.delta) }, context)
    if (queueError) throw queueError

    return
  }
  if (effect) learnSmsRef(entry.result.ref, effect.accountId)
  await applyWalletChanges(spreadsheetId, null, effect, context)
  if (queueError) throw queueError
}
