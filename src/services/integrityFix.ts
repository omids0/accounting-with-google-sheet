import { logActivity } from './activityLog'
import { checkAccount } from './integrityCheck'
import { fetchWalletAccounts } from './wallet'
import { appendLedgerEntries, fetchAllLedger, ledgerEntry } from './walletLedger'
import { getTodayIso } from '../utils/jalaliDate'
import { roundMoney } from '../utils/roundMoney'

/** The title of the one row «اصلاح با یک رکورد اصلاحی» adds to the account's history. */
export const INTEGRITY_FIX_TITLE = 'اصلاح بررسی یکپارچگی'

export type IntegrityFixResult = 'fixed' | 'changed' | 'not-fixable' | 'gone'

/**
 * Adds ONE labelled row to the account's «گردش حساب» so that the history adds up to the stored
 * balance. Nothing is edited or deleted, the balance itself is not touched, and no income or
 * expense is created. The account is read again first: when its difference is no longer
 * `expectedDifference` (a sync, another device) nothing is written.
 */
export async function postIntegrityCorrection(
  spreadsheetId: string,
  accountId: string,
  expectedDifference: number
): Promise<IntegrityFixResult> {
  const [accounts, ledger] = await Promise.all([
    fetchWalletAccounts(spreadsheetId),
    fetchAllLedger(spreadsheetId)
  ])
  const account = accounts.find(item => item.id === accountId)

  if (!account) return 'gone'

  const check = checkAccount(account, ledger)

  if (roundMoney(check.difference) !== roundMoney(expectedDifference)) return 'changed'
  if (!check.fixable) return 'not-fixable'

  await appendLedgerEntries(spreadsheetId, [
    ledgerEntry(accountId, check.difference, check.stored, {
      title: INTEGRITY_FIX_TITLE,
      date: getTodayIso(),
      source: 'اصلاح دستی'
    })
  ])
  logActivity(spreadsheetId, {
    action: 'reconcile',
    module: 'wallet',
    itemId: accountId,
    summary: `برای «${check.title}» یک ردیف اصلاح یکپارچگی در گردش حساب ثبت کرد`
  })

  return 'fixed'
}
