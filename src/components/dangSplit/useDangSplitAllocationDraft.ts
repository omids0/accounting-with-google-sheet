import { useEffect, useMemo, useState } from 'react'

import type { DangSplitCategoryWithRow, DangSplitPersonWithRow } from './types'
import type { DangSplitAllocationWithRow } from '../../services/dangSplitExpenses'
import {
  resolveEqualWeights,
  resolveManualWeights,
  splitExpenseShares,
  type DangSplitWeight
} from '../../services/dangSplitMath'
import type { DangSplitWeightMode } from '../../types/dangSplit'

/** حالت پیش‌نویس مودال تخصیص: چه کسانی انتخاب شده‌اند و سهمشان چطور حساب می‌شود */
export function useDangSplitAllocationDraft({
  open,
  amount,
  people,
  categories,
  currentAllocations
}: {
  open: boolean
  amount: number
  people: DangSplitPersonWithRow[]
  categories: DangSplitCategoryWithRow[]
  currentAllocations: DangSplitAllocationWithRow[]
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [mode, setMode] = useState<DangSplitWeightMode>('equal')
  const [manualPercents, setManualPercents] = useState<Record<string, number | ''>>({})
  const [pendingCategory, setPendingCategory] = useState<DangSplitCategoryWithRow | null>(null)

  // The allocation list is rebuilt on every render, so reset the draft from a
  // stable signature instead of the array identity — otherwise every keystroke
  // would wipe the selection.
  const currentSignature = currentAllocations.map(item => item.personId).join(',')

  useEffect(() => {
    if (!open) return

    setSelectedIds(currentSignature === '' ? [] : currentSignature.split(','))
    setMode('equal')
    setManualPercents({})
    setPendingCategory(null)
  }, [currentSignature, open])

  const selectedPeople = useMemo(
    () => people.filter(item => selectedIds.includes(item.id)),
    [people, selectedIds]
  )

  const numericPercents = useMemo(() => {
    const result: Record<string, number> = {}

    for (const [personId, value] of Object.entries(manualPercents)) {
      if (value !== '' && Number.isFinite(Number(value))) {
        result[personId] = Number(value)
      }
    }

    return result
  }, [manualPercents])

  const weights: DangSplitWeight[] = useMemo(
    () =>
      mode === 'equal'
        ? resolveEqualWeights(selectedPeople)
        : resolveManualWeights(selectedPeople, numericPercents),
    [mode, numericPercents, selectedPeople]
  )

  const shares = useMemo(() => splitExpenseShares(amount, weights), [amount, weights])

  const manualTotal = useMemo(
    () => selectedPeople.reduce((sum, item) => sum + (numericPercents[item.id] ?? 0), 0),
    [numericPercents, selectedPeople]
  )

  const togglePerson = (personId: string) => {
    setSelectedIds(current =>
      current.includes(personId)
        ? current.filter(item => item !== personId)
        : [...current, personId]
    )
  }

  const selectAll = () => {
    setSelectedIds(people.map(item => item.id))
  }

  const clearAll = () => {
    setSelectedIds([])
  }

  const categoryPeople = (categoryId: string) =>
    people.filter(item => item.categoryId === categoryId)

  const confirmCategory = () => {
    if (!pendingCategory) return

    const ids = categoryPeople(pendingCategory.id).map(item => item.id)

    setSelectedIds(current => [...new Set([...current, ...ids])])
    setPendingCategory(null)
  }

  const setPercent = (personId: string, value: number | '') => {
    setManualPercents(current => ({ ...current, [personId]: value }))
  }

  return {
    selectedIds,
    selectedPeople,
    mode,
    setMode,
    manualPercents,
    setPercent,
    manualTotal,
    weights,
    shares,
    togglePerson,
    selectAll,
    clearAll,
    categories,
    categoryPeople,
    pendingCategory,
    setPendingCategory,
    confirmCategory
  }
}
