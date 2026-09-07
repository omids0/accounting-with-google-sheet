import { getSettings } from './settings'
import { loadWalletPeriodFlow } from './wallet'

/**
 * Recomputes derived opening balances and mirrors them into «موجودی ماهانه»
 * right after a record changes, instead of waiting for the next dashboard or
 * wallet visit. Reads come from the local mirror, and the write skips months
 * whose value did not move, so a no-op change costs nothing.
 */
export function refreshOpeningBalancesInBackground(): void {
  const settings = getSettings()

  if (!settings?.spreadsheetId) return

  void loadWalletPeriodFlow(settings).catch(() => {
    /* derived values are recomputed on every read; the mirror can lag */
  })
}

/**
 * Resolves (and adopts, on first run) the anchor month without relying on the
 * dashboard or wallet having loaded first.
 */
export async function ensureAnchorMonthKey(): Promise<string> {
  const settings = getSettings()

  if (!settings?.spreadsheetId) return ''

  const flow = await loadWalletPeriodFlow(settings)

  return flow.anchorMonthKey
}
