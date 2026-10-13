import { useCallback, useMemo, useState } from 'react'

import { useRecordInputsState } from '../../../hooks/useRecordInputs'
import { aggregateByCounterparty } from '../../../services/counterpartiesReport'
import {
  exportCounterpartiesReportCsv,
  exportCounterpartiesReportPdf
} from '../../../services/counterpartiesReportExport'
import type { LineItemsReportType } from '../../../services/lineItemsReport'
import { runExport } from '../../../utils/exportFeedback'
import { useReportDateFilter } from '../ReportToolbar'

export function useCounterpartiesReport() {
  const { records, loaded } = useRecordInputsState()

  const [type, setType] = useState<LineItemsReportType>('expense')

  const [exporting, setExporting] = useState(false)

  const { datePreset, customRange, handleDateFilterChange, dateRange } = useReportDateFilter()

  const aggregate = useMemo(
    () => aggregateByCounterparty(records, dateRange, type),
    [records, dateRange, type]
  )

  const { rows } = aggregate

  const exportCsv = useCallback(() => {
    void runExport(() => exportCounterpartiesReportCsv(rows), 'خطا در ساخت خروجی CSV')
  }, [rows])

  const exportPdf = useCallback(async () => {
    setExporting(true)
    try {
      await runExport(() => exportCounterpartiesReportPdf(rows), 'خطا در ساخت خروجی PDF')
    } finally {
      setExporting(false)
    }
  }, [rows])

  return {
    loaded,
    type,
    setType,
    aggregate,
    datePreset,
    customRange,
    handleDateFilterChange,
    dateRange,
    exporting,
    exportCsv,
    exportPdf
  }
}
