import { filterByDateRange, sumByCategory } from './dashboardAggregation'
import { eventsInRange, netWorthReason } from './netWorthReason'
import { fetchNetWorthSnapshots } from './netWorthSheet'
import { loadNetWorthEvents, loadNetWorthRecords, loadTodayNetWorth } from './netWorthSources'
import { buildNetWorthTrend, type NetWorthTrend } from './netWorthTrend'
import type { AppSettings } from '../types'
import { getJalaliMonthKey, getJalaliMonthRange } from '../utils/dateRange'
import { getTodayIso } from '../utils/jalaliDate'

/** «دارایی خالص» on `/charts`: snapshots, today's value and the reasons behind the big months. */
export async function loadNetWorthTrend(settings: AppSettings): Promise<NetWorthTrend> {
  const id = settings.spreadsheetId
  const [snapshots, today, records, events] = await Promise.all([
    fetchNetWorthSnapshots(id),
    loadTodayNetWorth(settings),
    loadNetWorthRecords(settings),
    loadNetWorthEvents(id)
  ])

  return buildNetWorthTrend({
    snapshots,
    today,
    currentMonthKey: getJalaliMonthKey(getTodayIso()),
    reasonFor: (monthKey, direction) => {
      const range = getJalaliMonthRange(monthKey)

      if (!range) return ''

      return netWorthReason({
        direction,
        income: sumByCategory(
          filterByDateRange(records.incomeRecords, range, records.incomeDateField)
        ),
        expense: sumByCategory(
          filterByDateRange(records.expenseRecords, range, records.expenseDateField)
        ),
        events: eventsInRange(events, range)
      })
    }
  })
}
