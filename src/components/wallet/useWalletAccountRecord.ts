import type { WalletAccountWithRow } from './types'
import { useRouteRecord } from '../../hooks/useRouteRecord'

async function fetchAccounts(spreadsheetId: string): Promise<WalletAccountWithRow[]> {
  const { fetchWalletAccounts } = await import('../../services/wallet')

  return fetchWalletAccounts(spreadsheetId)
}

/** The wallet account of a `/wallet/:accountId…` route; `record` stays null for an unknown id. */
export function useWalletAccountRecord(accountId: string | undefined) {
  return useRouteRecord(accountId, fetchAccounts)
}
