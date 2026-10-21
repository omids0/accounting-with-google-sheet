import { logItemActivity } from './activityLog'
import { monthFlowOf, type FlowSide } from './buildingDashboard'
import { monthLabel, monthRangeOf } from './buildingMonths'
import { fundAccount, type FundAccountInput } from './buildingTemplate'
import { createLinkedExpenseRecord, createLinkedIncomeRecord } from './paymentTransactions'
import type { LinkedRecordParams } from './paymentTransactions'
import { applyWalletChanges, recordLedgerContext } from './recordWallet'
import { WALLET_LEDGER_SHEET, WALLET_SHEET } from './sheetNames'
import { appendSheetRow, fetchSheetRows } from './sheets'
import { accountToRow, updateWalletAccount } from './wallet'
import { logBalanceSet, rowToLedgerEntry, type LedgerEntry } from './walletLedger'
import { WALLET_APPLY_YES } from '../components/form/fieldUtils'
import type { MonthlyFlow, WalletAccount } from '../types'
import { RECONCILIATION_CATEGORY } from '../utils/protectedCategories'

/** The subcategory of a fund correction: the number came from the bank, not from a record. */
export const FUND_CORRECTION_SUBCATEGORY = 'تطبیق با بانک'

export interface FundCorrection {
  /** More money than the app thought is an income, less is an expense. */
  type: 'income' | 'expense'
  /** Real minus app: the signed amount the balance moves by. */
  signedAmount: number
  params: LinkedRecordParams
}

/**
 * The one record that closes the gap between a fund account's balance in the app and the real
 * one. The balance number is never edited: a record in the system category «اصلاح موجودی» moves
 * it, so the history keeps every step. Null when the two agree.
 */
export function fundCorrection(
  account: Pick<WalletAccount, 'id' | 'title' | 'balance'>,
  realBalance: number,
  note: string,
  dateIso: string
): FundCorrection | null {
  const signedAmount = Math.round(realBalance) - Math.round(account.balance)

  if (!signedAmount) return null

  return {
    type: signedAmount > 0 ? 'income' : 'expense',
    signedAmount,
    params: {
      title: `${RECONCILIATION_CATEGORY} · ${account.title}`,
      amount: Math.abs(signedAmount),
      category: RECONCILIATION_CATEGORY,
      subCategory: FUND_CORRECTION_SUBCATEGORY,
      note: note.trim(),
      date: dateIso,
      walletAccount: account.id,
      walletApply: WALLET_APPLY_YES
    }
  }
}

/** Writes the correction record and moves the account's balance by it; returns the record id. */
export async function recordFundCorrection(
  spreadsheetId: string,
  account: Pick<WalletAccount, 'id' | 'title' | 'balance'>,
  realBalance: number,
  note: string,
  dateIso: string
): Promise<string | null> {
  const correction = fundCorrection(account, realBalance, note, dateIso)

  if (!correction) return null

  const create =
    correction.type === 'expense' ? createLinkedExpenseRecord : createLinkedIncomeRecord

  const recordId = await create(spreadsheetId, correction.params)

  await applyWalletChanges(
    spreadsheetId,
    null,
    { accountId: account.id, delta: correction.signedAmount },
    recordLedgerContext({ ...correction.params }, 'اصلاح دستی', recordId)
  )
  logItemActivity(spreadsheetId, 'reconcile', 'wallet', account.id, account.title)

  return recordId
}

/** «+ حساب جدید»: the account and, when it starts with money, the ledger line that says so. */
export async function createFundAccount(
  spreadsheetId: string,
  input: FundAccountInput
): Promise<WalletAccount> {
  const account = fundAccount(input, new Date().toLocaleString('fa-IR'))

  await appendSheetRow(spreadsheetId, WALLET_SHEET, accountToRow(account))

  await logBalanceSet(spreadsheetId, account.id, 0, account.balance, 'موجودی اولیه')
  logItemActivity(spreadsheetId, 'create', 'wallet', account.id, account.title)

  return account
}

/** «ویرایش حساب» changes the name and the card only; the balance moves by records. */
export async function renameFundAccount(
  spreadsheetId: string,
  account: WalletAccount & { rowNumber: number },
  patch: Pick<FundAccountInput, 'title' | 'cardNumber'>
): Promise<void> {
  await updateWalletAccount(spreadsheetId, {
    ...account,
    title: patch.title.trim(),
    cardNumber: patch.cardNumber.trim()
  })
  logItemActivity(spreadsheetId, 'update', 'wallet', account.id, patch.title.trim())
}

/**
 * Collected and spent per month for the trend; transfers and corrections are not in it.
 * The months are Jalali month keys, oldest first.
 */
export function monthlyFlowSeries(
  income: FlowSide,
  expense: FlowSide,
  monthKeys: string[]
): MonthlyFlow[] {
  return monthKeys.map(monthKey => {
    const flow = monthFlowOf(income, expense, monthRangeOf(monthKey))

    return {
      monthKey,
      label: monthLabel(monthKey),
      income: flow.income,
      expense: flow.expense,
      net: flow.income - flow.expense
    }
  })
}

/** Every balance change of the fund, newest first (rows are only ever appended). */
export async function fetchFundLedger(
  spreadsheetId: string,
  limit: number
): Promise<LedgerEntry[]> {
  const rows = await fetchSheetRows(spreadsheetId, WALLET_LEDGER_SHEET)

  return rows
    .filter(row => String(row[0] ?? '').trim())
    .map(rowToLedgerEntry)
    .reverse()
    .slice(0, limit)
}
