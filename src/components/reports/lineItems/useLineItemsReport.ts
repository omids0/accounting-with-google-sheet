import { useCallback, useMemo, useState } from 'react'

import { useRecordInputsState } from '../../../hooks/useRecordInputs'
import {
  aggregateLineItems,
  priceChanges,
  type ItemStat,
  type LineItemsReportType
} from '../../../services/lineItemsReport'
import { exportLineItemsCsv, exportLineItemsPdf } from '../../../services/lineItemsReportExport'
import { getPreviousJalaliMonthRange } from '../../../utils/dateRange'
import { runExport } from '../../../utils/exportFeedback'
import { matchSearch } from '../../../utils/search'
import { useReportDateFilter } from '../ReportToolbar'

export type LineItemSort = 'total' | 'count' | 'average'

const SORT_VALUE: Record<LineItemSort, (item: ItemStat) => number> = {
  total: item => item.total,
  count: item => item.count,
  average: item => item.average
}

export function useLineItemsReport() {
  const { records, loaded } = useRecordInputsState()

  const [type, setType] = useState<LineItemsReportType>('expense')

  const [search, setSearch] = useState('')

  const [sort, setSort] = useState<LineItemSort>('total')

  const [exporting, setExporting] = useState(false)

  const { datePreset, customRange, handleDateFilterChange, dateRange } = useReportDateFilter()

  const aggregate = useMemo(
    () => aggregateLineItems(records, dateRange, type),
    [records, dateRange, type]
  )

  // «گران‌تر از ماه قبل» only compares whole-month views, and only means something for spending.
  const comparesMonths = datePreset === 'month-to-date' || datePreset === 'last-month'

  const pricier = useMemo(() => {
    if (!comparesMonths || type === 'income') return []

    const previous = aggregateLineItems(records, getPreviousJalaliMonthRange(dateRange), type)

    return priceChanges(aggregate.items, previous.items).filter(change => change.pct > 0)
  }, [aggregate.items, comparesMonths, dateRange, records, type])

  const items = useMemo(() => {
    const value = SORT_VALUE[sort]

    return aggregate.items
      .filter(item => matchSearch(search, item.name))
      .sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name, 'fa'))
  }, [aggregate.items, search, sort])

  const exportCsv = useCallback(() => {
    void runExport(() => exportLineItemsCsv(items), 'خطا در ساخت خروجی CSV', {
      empty: !items.length
    })
  }, [items])

  const exportPdf = useCallback(async () => {
    setExporting(true)
    try {
      await runExport(() => exportLineItemsPdf(items), 'خطا در ساخت خروجی PDF', {
        empty: !items.length
      })
    } finally {
      setExporting(false)
    }
  }, [items])

  return {
    loaded,
    type,
    setType,
    search,
    setSearch,
    sort,
    setSort,
    aggregate,
    items,
    pricier,
    comparesMonths,
    datePreset,
    customRange,
    handleDateFilterChange,
    dateRange,
    exporting,
    exportCsv,
    exportPdf
  }
}
