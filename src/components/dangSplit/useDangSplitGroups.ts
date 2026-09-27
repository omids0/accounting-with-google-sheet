import { useCallback, useEffect, useState } from 'react'

import type { DangSplitGroupListItem, DangSplitGroupWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { ensureDangSplitSheets, fetchDangSplitGroups } from '../../services/dangSplit'
import { deleteDangSplitGroupCascade } from '../../services/dangSplitBundle'
import { fetchDangSplitAllocations, fetchDangSplitExpenses } from '../../services/dangSplitExpenses'
import { buildGroupSummary } from '../../services/dangSplitMath'
import { fetchDangSplitPeople } from '../../services/dangSplitPeople'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

export function useDangSplitGroups() {
  const [items, setItems] = useState<DangSplitGroupListItem[]>([])
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })
  const [deletingItem, setDeletingItem] = useState<DangSplitGroupWithRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const dataRevision = useDataRefresh()

  const loadItems = useCallback(async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setLoading(true)
    try {
      await ensureDangSplitSheets(spreadsheetId)

      const [groups, people, expenses, allocations] = await Promise.all([
        fetchDangSplitGroups(spreadsheetId),
        fetchDangSplitPeople(spreadsheetId),
        fetchDangSplitExpenses(spreadsheetId),
        fetchDangSplitAllocations(spreadsheetId)
      ])

      setItems(
        groups.map(group => ({
          ...group,
          summary: buildGroupSummary({
            people: people.filter(item => item.groupId === group.id),
            expenses: expenses.filter(item => item.groupId === group.id),
            allocations: allocations.filter(item => item.groupId === group.id)
          })
        }))
      )
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری گروه‌های دنگ' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isConfigured()) return

    void loadItems()
  }, [loadItems, dataRevision])

  const openDeleteConfirm = (item: DangSplitGroupWithRow) => {
    setDeletingItem(item)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingItem(null)
  }

  const handleDelete = async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId || !deletingItem) return

    setDeleting(true)
    try {
      await deleteDangSplitGroupCascade(spreadsheetId, deletingItem)
      setItems(current => current.filter(item => item.id !== deletingItem.id))
      setDeletingItem(null)
      showSuccess('گروه دنگ حذف شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'حذف ناموفق بود')
    } finally {
      setDeleting(false)
    }
  }

  return {
    items,
    loading,
    deletingItem,
    deleting,
    loadItems,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete
  }
}
