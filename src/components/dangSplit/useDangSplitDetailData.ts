import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  DangSplitCategoryWithRow,
  DangSplitExpenseWithRow,
  DangSplitGroupWithRow,
  DangSplitPersonWithRow
} from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { fetchDangSplitBundle } from '../../services/dangSplitBundle'
import type { DangSplitAllocationWithRow } from '../../services/dangSplitExpenses'
import { buildGroupSummary } from '../../services/dangSplitMath'
import { isConfigured } from '../../services/settings'
import type { DangSplitGroupSummary } from '../../types/dangSplit'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'

export function useDangSplitDetailData(group: DangSplitGroupWithRow) {
  const [categories, setCategories] = useState<DangSplitCategoryWithRow[]>([])
  const [people, setPeople] = useState<DangSplitPersonWithRow[]>([])
  const [expenses, setExpenses] = useState<DangSplitExpenseWithRow[]>([])
  const [allocations, setAllocations] = useState<DangSplitAllocationWithRow[]>([])
  const [loading, setLoading] = useState(true)

  const dataRevision = useDataRefresh()

  const loadItems = useCallback(async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setLoading(true)
    try {
      const bundle = await fetchDangSplitBundle(spreadsheetId, group.id)

      setCategories(bundle.categories)
      setPeople(bundle.people)
      setExpenses(bundle.expenses)
      setAllocations(bundle.allocations)
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری اطلاعات دنگ' })
    } finally {
      setLoading(false)
    }
  }, [group.id])

  useEffect(() => {
    if (!isConfigured()) return

    void loadItems()
  }, [loadItems, dataRevision])

  const summary: DangSplitGroupSummary = useMemo(
    () => buildGroupSummary({ people, expenses, allocations }),
    [allocations, expenses, people]
  )

  const allocationsByExpense = useMemo(() => {
    const map = new Map<string, DangSplitAllocationWithRow[]>()

    for (const item of allocations) {
      const list = map.get(item.expenseId) ?? []

      list.push(item)
      map.set(item.expenseId, list)
    }

    return map
  }, [allocations])

  const peopleById = useMemo(() => new Map(people.map(item => [item.id, item])), [people])

  const categoryTitleById = useMemo(
    () => new Map(categories.map(item => [item.id, item.title])),
    [categories]
  )

  return {
    categories,
    people,
    expenses,
    allocations,
    allocationsByExpense,
    peopleById,
    categoryTitleById,
    summary,
    loading,
    loadItems
  }
}
