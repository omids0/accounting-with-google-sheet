import { smsRecordDate } from './bankSmsDate'
import { markBankSmsHandled } from './bankSmsNative'
import { getBankSmsPrefs, learnSmsRef, updateBankSmsPrefs } from './bankSmsPrefs'
import { nextAccountBalance, type ConfirmableSms } from './bankSmsQueue'
import { createLinkedExpenseRecord, createLinkedIncomeRecord } from './paymentTransactions'
import { applyWalletChanges, type RecordWalletEffect } from './recordWallet'
import { fetchWalletAccounts, updateWalletAccount } from './wallet'
import { OTHER_CATEGORY } from '../utils/categoryOrdering'

export { isConfirmable, type ConfirmableSms } from './bankSmsQueue'

export interface SmsRecordInput {
  title: string
  category: string
  subCategory: string
}

export const SMS_RECORD_NOTE = 'ثبت از پیامک'

async function applyBalance(spreadsheetId: string, entry: ConfirmableSms): Promise<void> {
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

  if (next.balance !== account.balance) {
    await updateWalletAccount(spreadsheetId, { ...account, balance: next.balance })
  }
  updateBankSmsPrefs({ balanceStates: { ...prefs.balanceStates, [account.id]: next.state } })
}

/**
 * Confirm one SMS: write the income/expense record (unless `record` is null,
 * i.e. «فقط به‌روزرسانی موجودی»), move the account balance, drop it from the queue.
 */
export async function confirmSmsEntry(
  spreadsheetId: string,
  entry: ConfirmableSms,
  record: SmsRecordInput | null
): Promise<void> {
  if (record) {
    const params = {
      title: record.title,
      amount: entry.amount,
      category: record.category,
      subCategory: record.subCategory,
      note: SMS_RECORD_NOTE,
      date: smsRecordDate(entry.sms.body, entry.sms.receivedAt),
      // Ties the record to the account, so editing or deleting it later fixes the balance.
      walletAccount: entry.result.accountId
    }

    if (entry.result.direction === 'debit') {
      await createLinkedExpenseRecord(spreadsheetId, params)
    } else {
      await createLinkedIncomeRecord(spreadsheetId, params)
    }

    // Leave the queue right after the record exists, so a failure below can
    // never lead to the same record being written twice.
    await markBankSmsHandled([entry.sms.id])

    const prefs = getBankSmsPrefs()

    updateBankSmsPrefs({
      lastCategory: {
        ...prefs.lastCategory,
        [entry.result.templateId]: { category: record.category, subCategory: record.subCategory }
      }
    })
  }

  if (!record) await markBankSmsHandled([entry.sms.id])
  await applyBalance(spreadsheetId, entry)
}

/** Own-account transfer: both balances move, no income or expense is recorded. */
export async function confirmSmsTransfer(
  spreadsheetId: string,
  debit: ConfirmableSms,
  credit: ConfirmableSms
): Promise<void> {
  await markBankSmsHandled([debit.sms.id, credit.sms.id])
  await applyBalance(spreadsheetId, debit)
  await applyBalance(spreadsheetId, credit)
}

export async function dismissSms(ids: string[]): Promise<void> {
  await markBankSmsHandled(ids)
}

/** Title and category used when confirming without opening the card («ثبت همه»). */
export function defaultSmsRecord(entry: ConfirmableSms, accountTitle: string): SmsRecordInput {
  const remembered = getBankSmsPrefs().lastCategory[entry.result.templateId]

  return {
    title: `${accountTitle} — پیامک`,
    category: remembered?.category || OTHER_CATEGORY,
    subCategory: remembered?.subCategory ?? ''
  }
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
  record: Pick<SmsRecordInput, 'category' | 'subCategory'>
): Promise<void> {
  await markBankSmsHandled([entry.sms.id])

  const prefs = getBankSmsPrefs()

  updateBankSmsPrefs({
    lastCategory: { ...prefs.lastCategory, [entry.result.templateId]: record }
  })

  if (effect && effect.accountId === entry.result.accountId) {
    await applyBalance(spreadsheetId, { ...entry, amount: Math.abs(effect.delta) })

    return
  }
  if (effect) learnSmsRef(entry.result.ref, effect.accountId)
  await applyWalletChanges(spreadsheetId, null, effect)
}
