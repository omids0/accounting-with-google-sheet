import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { isTokenValid } from '../../services/auth'
import {
  loadDashboardData,
  buildDashboardYearlyMonthlyFlow,
  peekCachedDashboardData
} from '../../services/dashboard'
import { getSettings, isConfigured, getNetAvailableConfig } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import type { DashboardData } from '../../types'
import {
  getInstallmentDueRange,
  resolveDateRange,
  type DateRangePreset,
  type RecordsDatePreset
} from '../../utils/dateRange'
import { formatDateRangeLabel } from '../../utils/dateRange'
import { buildDateRangeChip, compactFilterChips } from '../../utils/filterChips'
import { handleSheetError } from '../../utils/sheetError'
import { monthlySparkline } from '../../utils/sparklineData'
import { getCategoryBarYAxisWidth } from '../charts/chartUtils'
import { createDefaultDateRangeFilter } from '../DateRangeFilter'
import type { TransactionTypeSegmentOption } from '../TransactionTypeSegment'
import { getDefaultChartYear } from '../YearFilter'

export type TransactionTypeFilter = 'all' | 'income' | 'expense'

export function useDashboardPage(onReauth?: () => void) {
  const [data, setData] = useState<DashboardData | null>(() => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !hasStoreData(settings.spreadsheetId)) return null

    const range = resolveDateRange('month-to-date', createDefaultDateRangeFilter().customRange)

    const installmentRange = getInstallmentDueRange('month-to-date')

    return peekCachedDashboardData(
      settings,
      range,
      installmentRange,
      getDefaultChartYear(),
      getNetAvailableConfig()
    )
  })

  const [loading, setLoading] = useState(() => data == null)

  const [datePreset, setDatePreset] = useState<RecordsDatePreset>('month-to-date')

  const [customRange, setCustomRange] = useState(() => createDefaultDateRangeFilter().customRange)

  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all')

  const [monthlyFlowYear, setMonthlyFlowYear] = useState(getDefaultChartYear)

  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const [draftDatePreset, setDraftDatePreset] = useState<RecordsDatePreset>('month-to-date')

  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  )

  const dateRange = resolveDateRange(datePreset, customRange)

  const dataRevision = useDataRefresh()

  const dataRef = useRef(data)

  dataRef.current = data

  const load = useCallback(async () => {
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }

    const settings = getSettings()

    if (!settings) return

    if (!dataRef.current) {
      setLoading(true)
    }
    try {
      const range = resolveDateRange(datePreset, customRange)

      const installmentRange =
        datePreset === 'custom' ? range : getInstallmentDueRange(datePreset as DateRangePreset)

      const dash = await loadDashboardData(
        settings,
        range,
        installmentRange,
        monthlyFlowYear,
        getNetAvailableConfig()
      )

      setData(dash)
    } catch (err) {
      if (handleSheetError(err, { onReauth, fallbackMessage: 'خطا در بارگذاری' })) return
    } finally {
      setLoading(false)
    }
  }, [onReauth, datePreset, customRange, monthlyFlowYear])

  useEffect(() => {
    load()
  }, [load, dataRevision])

  useEffect(() => {
    const settings = getSettings()

    if (!settings || !data) return

    const range = resolveDateRange(datePreset, customRange)

    const installmentRange =
      datePreset === 'custom' ? range : getInstallmentDueRange(datePreset as DateRangePreset)

    const nextFlow = buildDashboardYearlyMonthlyFlow(
      settings,
      range,
      installmentRange,
      getNetAvailableConfig(),
      monthlyFlowYear
    )

    if (!nextFlow) return

    setData(prev => {
      if (!prev || prev.yearlyMonthlyFlow === nextFlow) return prev

      return { ...prev, yearlyMonthlyFlow: nextFlow }
    })
  }, [monthlyFlowYear, datePreset, customRange])

  const filteredRecords = useMemo(() => {
    if (!data?.recentRecords.length) return []

    return data.recentRecords
      .filter(r => typeFilter === 'all' || r.type === typeFilter)
      .slice(0, 10)
  }, [data?.recentRecords, typeFilter])

  const categoryYAxisWidth = useMemo(
    () => getCategoryBarYAxisWidth([data?.expenseByCategory ?? [], data?.incomeByCategory ?? []]),
    [data?.expenseByCategory, data?.incomeByCategory]
  )

  const financial = data?.financial

  const incomeSparkline = useMemo(
    () => monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'income'),
    [data?.yearlyMonthlyFlow]
  )

  const expenseSparkline = useMemo(
    () => monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'expense'),
    [data?.yearlyMonthlyFlow]
  )

  const netSparkline = useMemo(
    () => monthlySparkline(data?.yearlyMonthlyFlow ?? [], 'net'),
    [data?.yearlyMonthlyFlow]
  )

  const settings = useMemo(() => getSettings(), [])

  const incomeForm = settings?.forms.find(f => f.type === 'income')

  const expenseForm = settings?.forms.find(f => f.type === 'expense')

  const incomeFormName = incomeForm?.name ?? 'درآمد'

  const expenseFormName = expenseForm?.name ?? 'هزینه'

  const transactionTypeOptions = useMemo<TransactionTypeSegmentOption[]>(
    () => [
      { id: 'all', label: 'همه' },
      { id: 'income', label: incomeFormName, tone: 'income' },
      { id: 'expense', label: expenseFormName, tone: 'expense' }
    ],
    [incomeFormName, expenseFormName]
  )

  const openFilterModal = useCallback(() => {
    setDraftDatePreset(datePreset)
    setDraftCustomRange(customRange)
    setFilterModalOpen(true)
  }, [datePreset, customRange])

  const resetDateFilter = useCallback(() => {
    const defaults = createDefaultDateRangeFilter()

    setDatePreset(defaults.preset as RecordsDatePreset)
    setCustomRange(defaults.customRange)
  }, [])

  const filterChips = useMemo(
    () =>
      compactFilterChips([
        buildDateRangeChip(
          formatDateRangeLabel(dateRange),
          datePreset !== 'month-to-date' ? resetDateFilter : undefined
        )
      ]),
    [dateRange, datePreset, resetDateFilter]
  )

  return {
    data,
    loading,
    datePreset,
    setDatePreset,
    customRange,
    setCustomRange,
    typeFilter,
    setTypeFilter,
    monthlyFlowYear,
    setMonthlyFlowYear,
    filterModalOpen,
    setFilterModalOpen,
    draftDatePreset,
    setDraftDatePreset,
    draftCustomRange,
    setDraftCustomRange,
    load,
    filteredRecords,
    categoryYAxisWidth,
    financial,
    incomeSparkline,
    expenseSparkline,
    netSparkline,
    incomeFormName,
    expenseFormName,
    transactionTypeOptions,
    openFilterModal,
    filterChips
  }
}
