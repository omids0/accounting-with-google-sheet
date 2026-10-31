import type { ForecastAccount } from './cashForecast'
import type { ForecastSources } from './cashForecastEvents'
import { fetchChecks } from './checks'
import { fetchDangs } from './dang'
import { fetchInstallmentPlans } from './installments'
import { fetchPersonalReminders } from './personalReminders'
import { fetchRecurringItems } from './recurringSheet'
import { getItem, setItem } from './storage'
import { fetchWalletAccounts } from './wallet'

/** Per device, listed in `ACCOUNT_KEYS` (localDataWipe.ts): the accounts left out of the forecast. */
export const CASH_FORECAST_PREFS_KEY = 'accounting_cash_forecast_v1'

export interface CashForecastData {
  accounts: ForecastAccount[]
  sources: ForecastSources
  /** Names of the sources that could not be read; the forecast is missing their items. */
  failed: string[]
}

async function settle<T>(name: string, failed: string[], load: Promise<T[]>): Promise<T[]> {
  try {
    return await load
  } catch {
    failed.push(name)

    return []
  }
}

/** Wallet balances and every source of known upcoming money, read once for all three views. */
export async function loadCashForecastData(spreadsheetId: string): Promise<CashForecastData> {
  const failed: string[] = []

  // Without the balances there is nothing to start from, so that one is allowed to throw.
  const [wallet, checks, plans, dangs, recurring, reminders] = await Promise.all([
    fetchWalletAccounts(spreadsheetId),
    settle('چک‌ها', failed, fetchChecks(spreadsheetId)),
    settle('اقساط', failed, fetchInstallmentPlans(spreadsheetId)),
    settle('بدهی‌ها', failed, fetchDangs(spreadsheetId)),
    settle('تکرارها', failed, fetchRecurringItems(spreadsheetId)),
    settle('یادآوری‌ها', failed, fetchPersonalReminders(spreadsheetId))
  ])

  return {
    accounts: wallet.map(({ id, title, balance }) => ({ id, title, balance })),
    sources: { checks, plans, dangs, recurring, reminders },
    failed
  }
}

export function readExcludedAccountIds(spreadsheetId: string): Set<string> {
  const store = getItem<Record<string, string[]>>(CASH_FORECAST_PREFS_KEY) ?? {}
  const ids = store[spreadsheetId]

  return new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : [])
}

/** Remembers which accounts the user left out; a full or blocked storage just forgets. */
export function writeExcludedAccountIds(spreadsheetId: string, ids: ReadonlySet<string>): void {
  try {
    const store = getItem<Record<string, string[]>>(CASH_FORECAST_PREFS_KEY) ?? {}

    setItem(CASH_FORECAST_PREFS_KEY, { ...store, [spreadsheetId]: [...ids] })
  } catch {
    // Nothing to do: the choice still holds for this visit.
  }
}
