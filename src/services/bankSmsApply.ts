import { smsRecordDate } from './bankSmsDate'
import { markBankSmsHandled } from './bankSmsNative'
import { getBankSmsPrefs, learnSmsRef, updateBankSmsPrefs } from './bankSmsPrefs'
import { nextAccountBalance, type ConfirmableSms } from './bankSmsQueue'
import { smsSenderKey, type SmsCategoryChoice } from './bankSmsSuggest'
import { createLinkedExpenseRecord, createLinkedIncomeRecord } from './paymentTransactions'
import {
  applyWalletChanges,
  logUnappliedRecord,
  recordLedgerContext,
  type RecordWalletEffect
} from './recordWallet'
import { fetchWalletAccounts, updateWalletAccount } from './wallet'
import { ledgerEntry, logLedger, type LedgerContext } from './walletLedger'
import { WALLET_APPLY_NO } from '../components/form/fieldUtils'
import { roundMoney } from '../utils/roundMoney'

export { isConfirmable, type ConfirmableSms } from './bankSmsQueue'

export interface SmsRecordInput {
  title: string
  category: string
  subCategory: string
}

export const SMS_RECORD_NOTE = 'ثبت از پیامک'

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

/** Title and record of the ledger row; the source is always «پیامک». */
type SmsLedgerNote = { title?: string; recordId?: string }

async function applyBalance(
  spreadsheetId: string,
  entry: ConfirmableSms,
  note: SmsLedgerNote = {}
): Promise<void> {
  learnSmsRef(entry.result.ref, entry.result.accountId)

  const account = (await fetchWalletAccounts(spreadsheetId)).find(
    item => item.id === entry.result.accountId
  )

  if (!account) return

  const prefs = getBankSmsPrefs()
  const next = nextAccountBalance(
    account.balance,
    {
      receivedAt: entry.sms.receivedAt,
      direction: entry.result.direction,
      amount: entry.amount
    },
    entry.balance,
    prefs.balanceStates[account.id] ?? {}
  )

  if (!next) return

  const changed = roundMoney(next.balance) !== roundMoney(account.balance)

  if (changed) {
    await updateWalletAccount(spreadsheetId, { ...account, balance: next.balance })
  }
  updateBankSmsPrefs({ balanceStates: { ...prefs.balanceStates, [account.id]: next.state } })
  if (!changed) return

  await logLedger(spreadsheetId, [
    ledgerEntry(account.id, next.balance - account.balance, next.balance, {
      title: note.title || `پیامک ${account.title}`,
      date: smsRecordDate(entry.sms.body, entry.sms.receivedAt),
      source: 'پیامک',
      recordId: note.recordId
    })
  ])
}

/**
 * Confirm one SMS: write the income/expense record (unless `record` is null,
 * i.e. «فقط به‌روزرسانی موجودی»), move the account balance, drop it from the queue.
 * Resolves with the id of the record written ('' without one). `remember: false` keeps the
 * category out of the per-sender memory (a building's charge category must not be suggested
 * for the same bank in a personal workspace).
 */
export async function confirmSmsEntryWithId(
  spreadsheetId: string,
  entry: ConfirmableSms,
  record: SmsRecordInput | null,
  { remember = true }: { remember?: boolean } = {}
): Promise<string> {
  let recordId = ''

  if (record) {
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

    // Leave the queue right after the record exists, so a failure below can
    // never lead to the same record being written twice.
    await markBankSmsHandled([entry.sms.id])
    if (remember) rememberSmsCategory(entry, type, record)
    await logUnappliedRecord(
      spreadsheetId,
      type,
      params,
      recordLedgerContext(params, 'پیامک', recordId)
    ).catch(() => undefined)
  }

  if (!record) await markBankSmsHandled([entry.sms.id])
  await applyBalance(spreadsheetId, entry, { title: record?.title, recordId })

  return recordId
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

/** The record saved straight from a card or «ثبت همه»: its category and, when known, title. */
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
  await markBankSmsHandled([entry.sms.id])

  const smsType = entry.result.direction === 'debit' ? 'expense' : 'income'

  rememberSmsCategory(entry, effect ? (effect.delta < 0 ? 'expense' : 'income') : smsType, record)

  // Same account and same direction as the SMS: follow its «مانده». Otherwise (another
  // account, or the user switched income/expense) the record's own effect applies.
  if (effect && effect.accountId === entry.result.accountId && sameDirection(entry, effect)) {
    await applyBalance(spreadsheetId, { ...entry, amount: Math.abs(effect.delta) }, context)

    return
  }
  if (effect) learnSmsRef(entry.result.ref, effect.accountId)
  await applyWalletChanges(spreadsheetId, null, effect, context)
}
