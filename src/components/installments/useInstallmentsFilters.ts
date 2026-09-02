import { useState, useCallback, useMemo } from 'react'

import type { DisplayPlanItem, PlanWithRow } from './types'
import {
  getInstallmentDueDateInRange,
  isInstallmentPlanComplete,
  isInstallmentPlanVisible,
  paidInstallmentAmount,
  sortInstallmentPlans,
  totalInstallmentAmount,
  totalInstallmentsInRange,
  totalUnpaidInstallments
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
import { getTodayIso } from '../../utils/jalaliDate'
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

  const monthLabel = useMemo(
    () =>
      datePreset === 'month-to-date'
        ? formatJalaliMonthLabel(getJalaliMonthKey(getTodayIso()))
        : formatDateRangeLabel(effectiveRange),
    [datePreset, effectiveRange]
  )

  const monthTotals = useMemo(
    () => ({
      total: totalInstallmentsInRange(plans, effectiveRange),
      unpaid: totalUnpaidInstallments(plans, effectiveRange)
    }),
    [plans, effectiveRange]
  )

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

  const displayPlans = useMemo(
    () =>
      filteredPlans.map(plan => {
        const done = plan.payments.reduce((count, payment) => count + (payment.paid ? 1 : 0), 0)

        const complete = isInstallmentPlanComplete(plan)

        const totalAmount = totalInstallmentAmount(plan)

        const paidAmount = paidInstallmentAmount(plan)

        const progress = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0

        const dueDate = getInstallmentDueDateInRange(plan, effectiveRange)

        return { plan, done, complete, progress, dueDate } satisfies DisplayPlanItem
      }),
    [filteredPlans, effectiveRange]
  )

  const monthAmountSparkline = useMemo(
    () => distributionSparkline(monthPlans.map(plan => plan.amount)),
    [monthPlans]
  )

  const monthUnpaidSparkline = useMemo(
    () =>
      distributionSparkline(
        monthPlans.flatMap(plan =>
          plan.payments
            .filter(payment => !payment.paid)
            .map(payment => payment.amount ?? plan.amount)
        )
      ),
    [monthPlans]
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
    clearDraftFilters
  }
}
