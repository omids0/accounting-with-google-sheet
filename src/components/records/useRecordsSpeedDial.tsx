import { useCallback, useMemo, useState } from 'react'

import { exportRecordsCsv, exportRecordsPdf } from './recordsExport'
import type { StoredRecord } from './recordsUtils'
import { useRegisterPageSpeedDial, type PageSpeedDialAction } from '../../hooks/usePageSpeedDial'
import { isConfigured } from '../../services/settings'
import { useNavigationStore } from '../../stores/navigationStore'
import type { CustomForm } from '../../types'
import { runExport } from '../../utils/exportFeedback'
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
    void runExport(() => exportRecordsCsv(filteredRecords, forms), 'خطا در ساخت خروجی CSV', {
      empty: !filteredRecords.length
    })
  }, [filteredRecords, forms])

  const exportPdf = useCallback(async () => {
    setExporting(true)
    try {
      await runExport(() => exportRecordsPdf(filteredRecords, forms), 'خطا در ساخت خروجی PDF', {
        empty: !filteredRecords.length
      })
    } finally {
      setExporting(false)
    }
  }, [filteredRecords, forms])

  const config = useMemo(() => {
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
        label: 'خروجی CSV',
        icon: <SpeedDialIcon name="export" />,
        onClick: exportCsv
      },
      {
        id: 'export-pdf',
        label: 'خروجی PDF',
        icon: <SpeedDialIcon name="pdf" />,
        onClick: () => void exportPdf(),
        disabled: exporting
      }
    ]

    return { ariaLabel: 'عملیات تراکنش‌ها', actions }
  }, [
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
