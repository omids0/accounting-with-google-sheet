import { accountSms } from './bankSmsReconcile'
import { canReconcile, loadReconcileSms } from './bankSmsReconcileData'
import { readReconcileEntries } from './bankSmsReconcileStore'
import type { CloseYearAccount } from './closeYear'
import { fetchWalletAccounts } from './wallet'

/**
 * Wallet accounts for the reconcile step. SMS-backed: the phone holds bank SMS
 * for it (Android with capture on), or it was reconciled with one before — off
 * Android that past success is all that can be known.
 */
export async function loadCloseYearAccounts(spreadsheetId: string): Promise<CloseYearAccount[]> {
  const accounts = await fetchWalletAccounts(spreadsheetId)
  const sms = await loadReconcileSms(spreadsheetId, accounts).catch(() => [])
  const entries = readReconcileEntries(spreadsheetId)

  return accounts.map(account => {
    const at = entries[account.id]?.at

    return {
      id: account.id,
      title: account.title,
      cash: !canReconcile(account),
      smsBacked: accountSms(sms, account.id).length > 0 || !!at,
      reconciledAt: at
    }
  })
}
