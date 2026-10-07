import { markBankSmsHandled } from './bankSmsNative'
import { getBankSmsPrefs, updateBankSmsPrefs } from './bankSmsPrefs'
import { nextAccountBalance, type ConfirmableSms } from './bankSmsQueue'
import { createLinkedExpenseRecord, createLinkedIncomeRecord } from './paymentTransactions'
import { fetchWalletAccounts, updateWalletAccount } from './wallet'
import { toIsoDate } from '../utils/jalaliDate'

export { isConfirmable, type ConfirmableSms } from './bankSmsQueue'

export interface SmsRecordInput {
  title: string
  category: string
  subCategory: string
}

export const SMS_RECORD_NOTE = 'ثبت از پیامک'

async function applyBalance(spreadsheetId: string, entry: ConfirmableSms): Promise<void> {
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
    prefs.balanceAnchors[account.id]
  )

  if (!next) return

  if (next.balance !== account.balance) {
    await updateWalletAccount(spreadsheetId, { ...account, balance: next.balance })
  }
  if (next.anchor !== undefined) {
    updateBankSmsPrefs({ balanceAnchors: { ...prefs.balanceAnchors, [account.id]: next.anchor } })
  }
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
      date: toIsoDate(new Date(entry.sms.receivedAt))
    }

    if (entry.result.direction === 'debit') {
      await createLinkedExpenseRecord(spreadsheetId, params)
    } else {
      await createLinkedIncomeRecord(spreadsheetId, params)
    }

    const prefs = getBankSmsPrefs()

    updateBankSmsPrefs({
      lastCategory: {
        ...prefs.lastCategory,
        [entry.result.templateId]: { category: record.category, subCategory: record.subCategory }
      }
    })
  }

  await applyBalance(spreadsheetId, entry)
  await markBankSmsHandled([entry.sms.id])
}

/** Own-account transfer: both balances move, no income or expense is recorded. */
export async function confirmSmsTransfer(
  spreadsheetId: string,
  debit: ConfirmableSms,
  credit: ConfirmableSms
): Promise<void> {
  await applyBalance(spreadsheetId, debit)
  await applyBalance(spreadsheetId, credit)
  await markBankSmsHandled([debit.sms.id, credit.sms.id])
}

export async function dismissSms(ids: string[]): Promise<void> {
  await markBankSmsHandled(ids)
}
