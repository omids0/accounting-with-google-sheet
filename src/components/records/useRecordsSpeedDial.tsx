import { useCallback, useMemo, useState } from 'react'

import { exportRecordsCsv, exportRecordsPdf } from './recordsExport'
import type { StoredRecord } from './recordsUtils'
import { useRegisterPageSpeedDial, type PageSpeedDialAction } from '../../hooks/usePageSpeedDial'
import { isConfigured } from '../../services/settings'
import { useNavigationStore } from '../../stores/navigationStore'
import type { CustomForm } from '../../types'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'
import SpeedDialIcon from '../SpeedDialIcon'
import {
  speedDialActionExpenseClass,
  speedDialActionIncomeClass,
  speedDialTypeIconExpenseClass,
  speedDialTypeIconIncomeClass
} from '../ui/speedDialStyles'

type RecordsSpeedDialOptions = {
  forms: CustomForm[]
  filteredRecords: StoredRecord[]
  loading: boolean
  incomeFormName: string
  expenseFormName: string
  onOpenFilters: () => void
  onRefresh: () => void
}

/** Entry shortcuts like the dashboard's, plus export of the filtered list. */
export function useRecordsSpeedDial({
  forms,
  filteredRecords,
  loading,
  incomeFormName,
  expenseFormName,
  onOpenFilters,
  onRefresh
}: RecordsSpeedDialOptions) {
  const [exporting, setExporting] = useState(false)

  const exportCsv = useCallback(() => {
    exportRecordsCsv(filteredRecords, forms)
    showSuccess('خروجی اکسل آماده شد')
  }, [filteredRecords, forms])

  const exportPdf = useCallback(async () => {
    setExporting(true)
    try {
      await exportRecordsPdf(filteredRecords, forms)
      showSuccess('خروجی PDF آماده شد')
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ساخت خروجی PDF' })
    } finally {
      setExporting(false)
    }
  }, [filteredRecords, forms])

  const config = useMemo(() => {
    const hasRecords = filteredRecords.length > 0

    const actions: PageSpeedDialAction[] = [
      {
        id: 'income',
        label: incomeFormName,
        icon: <span className={speedDialTypeIconIncomeClass}>+</span>,
        className: speedDialActionIncomeClass,
        onClick: () => useNavigationStore.getState().onOpenEntry('income')
      },
      {
        id: 'expense',
        label: expenseFormName,
        icon: <span className={speedDialTypeIconExpenseClass}>−</span>,
        className: speedDialActionExpenseClass,
        onClick: () => useNavigationStore.getState().onOpenEntry('expense')
      },
      {
        id: 'filter',
        label: 'فیلتر',
        icon: <SpeedDialIcon name="filter" />,
        onClick: onOpenFilters
      },
      {
        id: 'refresh',
        label: 'بروزرسانی',
        icon: <SpeedDialIcon name="refresh" />,
        onClick: onRefresh,
        disabled: loading
      },
      {
        id: 'export',
        label: 'خروجی اکسل',
        icon: <SpeedDialIcon name="export" />,
        onClick: exportCsv,
        disabled: !hasRecords
      },
      {
        id: 'export-pdf',
        label: 'خروجی PDF',
        icon: <SpeedDialIcon name="pdf" />,
        onClick: () => void exportPdf(),
        disabled: !hasRecords || exporting
      }
    ]

    return { ariaLabel: 'عملیات تراکنش‌ها', actions }
  }, [
    filteredRecords.length,
    incomeFormName,
    expenseFormName,
    onOpenFilters,
    onRefresh,
    loading,
    exportCsv,
    exportPdf,
    exporting
  ])

  useRegisterPageSpeedDial(isConfigured() ? config : null)
}
