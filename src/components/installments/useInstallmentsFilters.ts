import { useState, useCallback, useMemo } from 'react'

import type { DisplayPlanItem, PlanWithRow } from './types'
import {
  getInstallmentDueDateInRange,
  installmentAmountInRange,
  isInstallmentPlanComplete,
  isInstallmentPlanVisible,
  isInstallmentSettledForRange,
  paidInstallmentAmount,
  sortInstallmentPlans,
  totalInstallmentAmount,
  totalInstallmentsInRange,
  totalUnpaidInstallments,
  unpaidInstallmentAmountInRange
} from '../../services/installments'
import {
  formatDateRangeLabel,
  formatJalaliMonthLabel,
  getInstallmentDueRange,
  getJalaliMonthKey,
  resolveDateRange,
  type RecordsDatePreset
} from '../../utils/dateRange'
import { buildDateRangeChip, buildSearchChip, compactFilterChips } from '../../utils/filterChips'
import { matchSearch } from '../../utils/search'
import { distributionSparkline } from '../../utils/sparklineData'
import { createDefaultDateRangeFilter } from '../DateRangeFilter'

export function useInstallmentsFilters(plans: PlanWithRow[]) {
  const [searchQuery, setSearchQuery] = useState('')

  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const [draftSearch, setDraftSearch] = useState('')

  const [draftDatePreset, setDraftDatePreset] = useState<RecordsDatePreset>(
    () => createDefaultDateRangeFilter().preset as RecordsDatePreset
  )

  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  )

  const [datePreset, setDatePreset] = useState<RecordsDatePreset>(
    () => createDefaultDateRangeFilter().preset as RecordsDatePreset
  )

  const [customRange, setCustomRange] = useState(() => createDefaultDateRangeFilter().customRange)

  const effectiveRange = useMemo(() => {
    if (datePreset === 'custom') {
      return resolveDateRange('custom', customRange)
    }

    return getInstallmentDueRange(datePreset)
  }, [datePreset, customRange])

  const monthLabel = useMemo(() => {
    const startMonthKey = getJalaliMonthKey(effectiveRange.start)
    const endMonthKey = getJalaliMonthKey(effectiveRange.end)

    if (startMonthKey === endMonthKey) {
      return formatJalaliMonthLabel(startMonthKey)
    }

    return formatDateRangeLabel(effectiveRange)
  }, [effectiveRange])

  const monthPlans = useMemo(
    () =>
      sortInstallmentPlans(plans.filter(plan => isInstallmentPlanVisible(plan, effectiveRange))),
    [plans, effectiveRange]
  )

  const filteredPlans = useMemo(
    () =>
      monthPlans.filter(plan =>
        matchSearch(searchQuery, plan.title, plan.note, plan.amount, plan.count)
      ),
    [monthPlans, searchQuery]
  )

  const monthTotals = useMemo(
    () => ({
      total: totalInstallmentsInRange(filteredPlans, effectiveRange),
      unpaid: totalUnpaidInstallments(filteredPlans, effectiveRange)
    }),
    [filteredPlans, effectiveRange]
  )

  const displayPlans = useMemo(
    () =>
      filteredPlans.map(plan => {
        const done = plan.payments.reduce((count, payment) => count + (payment.paid ? 1 : 0), 0)

        const complete = isInstallmentPlanComplete(plan)

        const totalAmount = totalInstallmentAmount(plan)

        const paidAmount = paidInstallmentAmount(plan)

        const progress = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0

        const dueDate = getInstallmentDueDateInRange(plan, effectiveRange)

        const settledForRange = isInstallmentSettledForRange(plan, effectiveRange)

        return {
          plan,
          done,
          complete,
          settledForRange,
          progress,
          dueDate
        } satisfies DisplayPlanItem
      }),
    [filteredPlans, effectiveRange]
  )

  const monthAmountSparkline = useMemo(
    () =>
      distributionSparkline(
        filteredPlans.map(plan => installmentAmountInRange(plan, effectiveRange))
      ),
    [filteredPlans, effectiveRange]
  )

  const monthUnpaidSparkline = useMemo(
    () =>
      distributionSparkline(
        filteredPlans
          .map(plan => unpaidInstallmentAmountInRange(plan, effectiveRange))
          .filter(amount => amount > 0)
      ),
    [filteredPlans, effectiveRange]
  )

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery)
    setDraftDatePreset(datePreset)
    setDraftCustomRange(customRange)
    setFilterModalOpen(true)
  }, [searchQuery, datePreset, customRange])

  const resetDateFilter = useCallback(() => {
    const defaults = createDefaultDateRangeFilter()

    setDatePreset(defaults.preset as RecordsDatePreset)
    setCustomRange(defaults.customRange)
  }, [])

  const filterChips = useMemo(
    () =>
      compactFilterChips([
        buildDateRangeChip(
          formatDateRangeLabel(effectiveRange),
          datePreset !== 'month-to-date' ? resetDateFilter : undefined
        ),
        buildSearchChip(searchQuery, () => setSearchQuery(''))
      ]),
    [effectiveRange, datePreset, resetDateFilter, searchQuery]
  )

  const applyDraftFilters = () => {
    setSearchQuery(draftSearch)
    setDatePreset(draftDatePreset)
    setCustomRange(draftCustomRange)
    setFilterModalOpen(false)
  }

  const clearDraftFilters = () => {
    const defaults = createDefaultDateRangeFilter()

    setDraftSearch('')
    setDraftDatePreset(defaults.preset as RecordsDatePreset)
    setDraftCustomRange(defaults.customRange)
  }

  const clearAllFilters = useCallback(() => {
    const defaults = createDefaultDateRangeFilter()

    setSearchQuery('')
    setDatePreset(defaults.preset as RecordsDatePreset)
    setCustomRange(defaults.customRange)
  }, [])

  return {
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    draftDatePreset,
    setDraftDatePreset,
    draftCustomRange,
    setDraftCustomRange,
    monthLabel,
    monthTotals,
    monthPlans,
    filteredPlans,
    displayPlans,
    monthAmountSparkline,
    monthUnpaidSparkline,
    filterChips,
    openFilterModal,
    applyDraftFilters,
    clearDraftFilters,
    clearAllFilters
  }
}
