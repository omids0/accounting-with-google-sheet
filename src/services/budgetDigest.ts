import { setDigestNotesNative } from './bankSmsNative'
import { pickBudgetAlerts, type BudgetAlertLog } from './budgets'
import { fetchBudgets } from './budgetsSheet'
import { filterByDateRange, getDateFieldId, sumByCategory } from './dashboardAggregation'
import { recurringDigestLines } from './recurringDigest'
import { getSettings } from './settings'
import { fetchRecords } from './sheets'
import { getItem, setItem } from './storage'
import { getDateRange, getJalaliMonthKey } from '../utils/dateRange'
import { getTodayIso } from '../utils/jalaliDate'

/** Per spreadsheet: `{ [spreadsheetId]: BudgetAlertLog }` — the once-per-month gate. */
export const BUDGET_ALERTS_STORAGE_KEY = 'accounting_budget_alerts_v1'

function readLog(spreadsheetId: string): BudgetAlertLog {
  return getItem<Record<string, BudgetAlertLog>>(BUDGET_ALERTS_STORAGE_KEY)?.[spreadsheetId] ?? {}
}

function writeLog(spreadsheetId: string, log: BudgetAlertLog): void {
  const store = getItem<Record<string, BudgetAlertLog>>(BUDGET_ALERTS_STORAGE_KEY) ?? {}

  try {
    setItem(BUDGET_ALERTS_STORAGE_KEY, { ...store, [spreadsheetId]: log })
  } catch {
    // Private mode: an alert may repeat on another day; harmless.
  }
}

/**
 * Budget lines for tonight's digest («خوراک به ۸۰٪ بودجه رسید», «… از بودجه گذشت»),
 * plus «N تکرار ثبت‌نشده» once a month.
 * Alerts live only in the native nightly digest: no toast, no banner.
 */
export async function syncBudgetDigest(spreadsheetId: string): Promise<void> {
  const settings = getSettings()
  const form = settings?.forms.find(item => item.type === 'expense')

  if (!settings || settings.spreadsheetId !== spreadsheetId || !form) return

  const budgets = await fetchBudgets(spreadsheetId)
  const today = getTodayIso()
  let lines: string[] = []

  if (budgets.length) {
    const records = filterByDateRange(
      await fetchRecords(spreadsheetId, form),
      getDateRange('month-to-date'),
      getDateFieldId(form)
    )
    const spent = new Map(sumByCategory(records).map(item => [item.name, item.total]))
    const pick = pickBudgetAlerts(
      budgets,
      spent,
      getJalaliMonthKey(today),
      today,
      readLog(spreadsheetId)
    )

    writeLog(spreadsheetId, pick.log)
    lines = pick.lines
  }

  // Reminder-mode recurring items not posted yet: one line, once a month.
  lines = [...lines, ...(await recurringDigestLines(spreadsheetId, today).catch(() => []))]

  await setDigestNotesNative(today, lines)
}
