import { useMemo } from 'react'

import { useRecordInputsState } from '../../../hooks/useRecordInputs'
import {
  aggregateLineItems,
  itemHistory,
  itemOccurrences,
  similarItemNames,
  topOccurrenceCounterparty,
  type LineItemsReportType
} from '../../../services/lineItemsReport'
import { getJalaliMonthRange } from '../../../utils/dateRange'

const HISTORY_MONTHS = 12

const EVERYTHING = { start: '0000-01-01', end: '9999-12-31' }

/** Everything the item page shows about one item: 12 months of totals, its records, look-alikes. */
export function useLineItemPage(itemKey: string, type: LineItemsReportType) {
  const { records, loaded } = useRecordInputsState()

  return useMemo(() => {
    const typed = type === 'all' ? records : records.filter(record => record.type === type)

    const history = itemHistory(typed, itemKey, HISTORY_MONTHS)

    const occurrences = itemOccurrences(typed, itemKey)

    const windowStart = getJalaliMonthRange(history[0]?.month ?? '')?.start ?? ''

    const total = history.reduce((sum, entry) => sum + entry.total, 0)

    const count = history.reduce((sum, entry) => sum + entry.count, 0)

    // «ماهی ~X» spreads the total over the months since the item first appeared in the window.
    const firstActive = history.findIndex(entry => entry.count > 0)

    const activeMonths = firstActive < 0 ? 1 : history.length - firstActive

    const catalog = aggregateLineItems(typed, EVERYTHING, 'all').items

    const nameOf = (key: string) => catalog.find(item => item.key === key)?.name ?? key

    return {
      loaded,
      name: nameOf(itemKey),
      history,
      occurrences,
      total,
      count,
      perMonth: Math.round(total / activeMonths),
      topCounterparty: topOccurrenceCounterparty(occurrences.filter(o => o.date >= windowStart)),
      similar: similarItemNames(
        catalog.map(item => item.key),
        itemKey
      ).map(key => ({ key, name: nameOf(key) }))
    }
  }, [records, loaded, itemKey, type])
}
