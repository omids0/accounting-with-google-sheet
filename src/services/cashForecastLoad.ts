import type { ForecastAccount } from './cashForecast'
import type { ForecastSources } from './cashForecastEvents'
import {
  averageDailySpending,
  NO_SPENDING_HISTORY,
  type SpendingAverage,
  type SpendingRecord
} from './cashForecastSpending'
import { fetchChecks } from './checks'
import { fetchDangs } from './dang'
import { getDateFieldId } from './dashboardAggregation'
import { fetchInstallmentPlans } from './installments'
import { fetchPersonalReminders } from './personalReminders'
import { isRecordLinked } from './recordLinks'
import { isRecurringBorn } from './recurring'
import { fetchRecurringItems } from './recurringSheet'
import { getSettings } from './settings'
import { fetchRecords } from './sheetsRecords'
import { getItem, setItem } from './storage'
import { fetchWalletAccounts } from './wallet'
import type { RecurringItem } from '../types'
import { getTodayIso } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'

/** Per device, listed in `ACCOUNT_KEYS` (localDataWipe.ts): the accounts left out of the forecast. */
export const CASH_FORECAST_PREFS_KEY = 'accounting_cash_forecast_v1'

export interface CashForecastData {
  accounts: ForecastAccount[]
  sources: ForecastSources
  /** Average daily spending of the last 90 days, apart from installments, checks, debts, recurring. */
  spending: SpendingAverage
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

/** Expense records of the last 90 days reduced to a per-day average (see `averageDailySpending`). */
async function loadSpendingAverage(
  spreadsheetId: string,
  recurring: RecurringItem[]
): Promise<SpendingAverage> {
  const form = getSettings()?.forms.find(item => item.type === 'expense')

  if (!form) return NO_SPENDING_HISTORY

  const dateField = getDateFieldId(form)
  const records = await fetchRecords(spreadsheetId, form)
  const posted = new Set(records.filter(record => isRecurringBorn(record.values)).map(r => r.id))
  const rows: SpendingRecord[] = records.map(record => ({
    id: record.id,
    date: String(record.values[dateField] ?? '').slice(0, 10),
    amount: parseNumeric(record.values.amount),
    title: String(record.values.title ?? '').trim(),
    category: String(record.values.category ?? '').trim()
  }))

  return averageDailySpending(rows, {
    todayIso: getTodayIso(),
    recurring,
    postedByRecurring: posted,
    isLinked: id => isRecordLinked(spreadsheetId, id, 'expense')
  })
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

  const spending = await loadSpendingAverage(spreadsheetId, recurring).catch(() => {
    failed.push('خرج‌های ثبت‌شده')

    return NO_SPENDING_HISTORY
  })

  return {
    accounts: wallet.map(({ id, title, balance }) => ({ id, title, balance })),
    sources: { checks, plans, dangs, recurring, reminders },
    spending,
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
