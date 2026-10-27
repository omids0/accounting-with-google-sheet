import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { loadDashboardData, peekCachedDashboardData } from '../../services/dashboard'
import {
  fetchDashboardReminderItems,
  type DashboardReminderItem
} from '../../services/dashboardReminders'
import { getSettings, isConfigured, getNetAvailableConfig } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import type { DashboardData } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import {
  getInstallmentDueRange,
  getPreviousJalaliMonthRange,
  resolveDateRange,
  type DateRange,
  type DateRangePreset,
  type RecordsDatePreset
} from '../../utils/dateRange'
import { getTodayIso } from '../../utils/jalaliDate'
import { describePeriod } from '../../utils/periodLabel'
import { handOffReportPeriod } from '../../utils/reportPeriodHandoff'
import { handleSheetError } from '../../utils/sheetError'
import { createDefaultDateRangeFilter } from '../DateRangeFilter'
import type { DashboardFilterControls } from './DashboardContent'
import { getDefaultChartYear } from '../YearFilter'

/** Enough to count every overdue item for the «· N معوق» note; the block shows three. */
const UPCOMING_FETCH_LIMIT = 50

function installmentRangeFor(preset: RecordsDatePreset, range: DateRange): DateRange {
  return preset === 'custom' ? range : getInstallmentDueRange(preset as DateRangePreset)
}

export function useDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(() => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !hasStoreData(settings.spreadsheetId)) return null

    const range = resolveDateRange('month-to-date', createDefaultDateRangeFilter().customRange)

    return peekCachedDashboardData(
      settings,
      range,
      getInstallmentDueRange('month-to-date'),
      getDefaultChartYear(),
      getNetAvailableConfig()
    )
  })

  const [loading, setLoading] = useState(() => data == null)

  const [upcomingReminders, setUpcomingReminders] = useState<DashboardReminderItem[]>([])

  const [datePreset, setDatePreset] = useState<RecordsDatePreset>('month-to-date')

  const [customRange, setCustomRange] = useState(() => createDefaultDateRangeFilter().customRange)

  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const [draftDatePreset, setDraftDatePreset] = useState<RecordsDatePreset>('month-to-date')

  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  )

  // Stable identity so memos keyed on dateRange don't recompute every render.
  const dateRange = useMemo(
    () => resolveDateRange(datePreset, customRange),
    [datePreset, customRange]
  )

  const period = useMemo(() => describePeriod(dateRange, getTodayIso()), [dateRange])

  const dataRevision = useDataRefresh()

  const dataRef = useRef(data)

  dataRef.current = data

  const load = useCallback(async () => {
    if (!isConfigured() || !requireAuth()) {
      return
    }

    const settings = getSettings()

    if (!settings) return

    if (!dataRef.current) {
      setLoading(true)
    }
    try {
      const range = resolveDateRange(datePreset, customRange)

      const [dash, reminderItems] = await Promise.all([
        loadDashboardData(
          settings,
          range,
          installmentRangeFor(datePreset, range),
          getDefaultChartYear(),
          getNetAvailableConfig()
        ),
        fetchDashboardReminderItems(settings.spreadsheetId, { limit: UPCOMING_FETCH_LIMIT }).catch(
          () => []
        )
      ])

      setData(dash)
      setUpcomingReminders(reminderItems)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری' })) return
    } finally {
      setLoading(false)
    }
  }, [datePreset, customRange])

  useEffect(() => {
    load()
  }, [load, dataRevision])

  const settings = useMemo(() => getSettings(), [])

  const incomeFormName = settings?.forms.find(f => f.type === 'income')?.name ?? 'درآمد'

  const expenseFormName = settings?.forms.find(f => f.type === 'expense')?.name ?? 'هزینه'

  const openFilterModal = useCallback(() => {
    setDraftDatePreset(datePreset)
    setDraftCustomRange(customRange)
    setFilterModalOpen(true)
  }, [datePreset, customRange])

  const filter: DashboardFilterControls = {
    open: filterModalOpen,
    setOpen: setFilterModalOpen,
    draftPreset: draftDatePreset,
    setDraftPreset: setDraftDatePreset,
    draftRange: draftCustomRange,
    setDraftRange: setDraftCustomRange,
    apply: () => {
      setDatePreset(draftDatePreset)
      setCustomRange(draftCustomRange)
      setFilterModalOpen(false)
    }
  }

  const showPreviousMonth = useCallback(() => {
    if (datePreset === 'month-to-date') {
      setDatePreset('last-month')

      return
    }

    setDatePreset('custom')
    setCustomRange(getPreviousJalaliMonthRange(dateRange))
  }, [datePreset, dateRange])

  /** Opens a report with the dashboard's period, so «ماه گذشته» keeps showing the same numbers. */
  const handOffPeriodToReport = useCallback(
    () => handOffReportPeriod({ preset: datePreset, customRange }),
    [datePreset, customRange]
  )

  return {
    data,
    loading,
    period,
    handOffPeriodToReport,
    filter,
    load,
    incomeFormName,
    expenseFormName,
    openFilterModal,
    showPreviousMonth,
    upcomingReminders
  }
}
