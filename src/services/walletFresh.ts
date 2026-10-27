import { refreshRowFromSheet } from './freshRow'
import { WALLET_SHEET } from './sheetNames'

/**
 * Before a balance is moved: reads each of these accounts from Google Sheets (one row each) into
 * the local mirror, so the change is applied to the balance the sheet holds now. Offline, with a
 * write to the tab still queued, or on a failed or slow read, the local copy stays and the queued
 * write is merged on top of the sheet when it is sent (see walletRowMerge). Resolves with the ids
 * the sheet no longer has (an account deleted on another device).
 */
export async function refreshWalletAccounts(
  spreadsheetId: string,
  accountIds: Iterable<string>
): Promise<Set<string>> {
  const ids = [...new Set(accountIds)]

  const results = await Promise.all(
    ids.map(id => refreshRowFromSheet(spreadsheetId, WALLET_SHEET, id))
  )

  return new Set(ids.filter((_, index) => results[index] === 'missing'))
}
