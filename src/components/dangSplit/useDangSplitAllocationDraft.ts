import { useEffect, useMemo, useRef, useState } from 'react'

import {
  isAllocationDraftUnchanged,
  manualPercentsError,
  resolveDraftWeights,
  seedAllocationDraft,
  toNumericPercents,
  type AllocationDraftSeed
} from './dangSplitAllocationSeed'
import type { DangSplitCategoryWithRow, DangSplitPersonWithRow } from './types'
import type { DangSplitAllocationWithRow } from '../../services/dangSplitExpenses'
import { splitExpenseShares, type DangSplitWeight } from '../../services/dangSplitMath'
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
  const [seed, setSeed] = useState<AllocationDraftSeed>(() => seedAllocationDraft([], []))
  const [pendingCategory, setPendingCategory] = useState<DangSplitCategoryWithRow | null>(null)
  const latest = useRef({ people, currentAllocations })

  latest.current = { people, currentAllocations }

  // The allocation list is rebuilt on every render, so reset the draft from a
  // stable signature instead of the array identity — otherwise every keystroke
  // would wipe the selection. The signature carries the stored weights: the draft
  // opens in the mode that produced them (see seedAllocationDraft).
  const currentSignature = currentAllocations
    .map(item => `${item.personId}:${item.weight}`)
    .join(',')
  const peopleSignature = people.map(item => `${item.id}:${item.defaultWeight}`).join(',')

  useEffect(() => {
    if (!open) return

    const next = seedAllocationDraft(latest.current.people, latest.current.currentAllocations)

    setSeed(next)
    setSelectedIds(next.selectedIds)
    setMode(next.mode)
    setManualPercents(next.manualPercents)
    setPendingCategory(null)
  }, [currentSignature, peopleSignature, open])

  const selectedPeople = useMemo(
    () => people.filter(item => selectedIds.includes(item.id)),
    [people, selectedIds]
  )

  const numericPercents = useMemo(() => toNumericPercents(manualPercents), [manualPercents])

  // Untouched, the draft hands back the stored weights as they are; only an edit
  // recomputes them from the people's default weights or the typed percents.
  const unchanged = useMemo(
    () => isAllocationDraftUnchanged(seed, { selectedIds, mode, manualPercents }),
    [seed, selectedIds, mode, manualPercents]
  )

  const weights: DangSplitWeight[] = useMemo(
    () =>
      resolveDraftWeights({ seed, draft: { selectedIds, mode, manualPercents }, selectedPeople }),
    [seed, selectedIds, mode, manualPercents, selectedPeople]
  )

  const percentError = useMemo(
    () =>
      mode === 'manual' && !unchanged ? manualPercentsError(selectedPeople, numericPercents) : null,
    [mode, unchanged, selectedPeople, numericPercents]
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
    // The browser no longer stops a percent outside 0–100; keep it inside here.
    const next = value === '' ? '' : Math.min(100, Math.max(0, value))

    setManualPercents(current => ({ ...current, [personId]: next }))
  }

  return {
    selectedIds,
    selectedPeople,
    mode,
    setMode,
    manualPercents,
    setPercent,
    manualTotal,
    percentError,
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
