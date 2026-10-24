import type { WalletAccountWithRow } from './types'
import { useRouteRecord } from '../../hooks/useRouteRecord'

async function fetchAccounts(spreadsheetId: string): Promise<WalletAccountWithRow[]> {
  const { fetchWalletAccounts } = await import('../../services/wallet')

  return fetchWalletAccounts(spreadsheetId)
}

/**
 * The wallet account of a `/wallet/:accountId…` route; `record` stays null for an unknown id
 * and `error` is set when the read itself failed. `enabled: false` skips the read.
 */
export function useWalletAccountRecord(accountId: string | undefined, enabled = true) {
  return useRouteRecord(accountId, fetchAccounts, enabled)
}
