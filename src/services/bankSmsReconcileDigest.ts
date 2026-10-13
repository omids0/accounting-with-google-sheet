import { todaysDigestLines } from './bankSmsReconcile'
import {
  isReconcileAvailable,
  loadReconcileSms,
  refreshReconcileDigest
} from './bankSmsReconcileData'
import { readReconcileDigestGate } from './bankSmsReconcileStore'
import { loadRecordLedger } from './recordLedger'
import { getSettings } from './settings'
import { fetchWalletAccounts } from './wallet'

/**
 * Tonight's «ملت ۳۵۰ هزار اختلاف دارد» lines, for `syncBudgetDigest`. Built once per
 * day (the wallet page and the wizard refresh them as they compute; a reconciliation
 * or «نادیده» drops that account's line).
 */
export async function reconcileDigestLines(
  spreadsheetId: string,
  todayIso: string
): Promise<string[]> {
  const built = todaysDigestLines(readReconcileDigestGate(spreadsheetId), todayIso)

  if (built) return built

  const settings = getSettings()

  if (!isReconcileAvailable() || settings?.spreadsheetId !== spreadsheetId) return []

  const accounts = await fetchWalletAccounts(spreadsheetId)
  const [reviewed, ledger] = await Promise.all([
    loadReconcileSms(spreadsheetId, accounts),
    loadRecordLedger(settings)
  ])

  return refreshReconcileDigest(spreadsheetId, accounts, reviewed, ledger)
}
