import { useCallback, useEffect, useMemo, useState } from 'react'

import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { isTokenValid } from '../../services/auth'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import {
  createTimesheet,
  deleteTimesheet,
  ensureTimesheetsSheet,
  exportTimesheetsCsv,
  exportTimesheetsPdf,
  fetchTimesheets,
  importTimesheetsCsv,
  updateTimesheet
} from '../../services/timesheet'
import type { Timesheet } from '../../types'
import { buildSearchChip, compactFilterChips } from '../../utils/filterChips'
import { matchSearch } from '../../utils/search'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

export type TimesheetWithRow = Timesheet & { rowNumber: number }

export function useTimesheetsPage(onReauth?: () => void) {
  const [items, setItems] = useState<TimesheetWithRow[]>([])

  const [showForm, setShowForm] = useState(false)

  const [editingItem, setEditingItem] = useState<TimesheetWithRow | null>(null)

  const [deletingItem, setDeletingItem] = useState<TimesheetWithRow | null>(null)

  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const dataRevision = useDataRefresh()

  const [searchQuery, setSearchQuery] = useState('')

  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const [draftSearch, setDraftSearch] = useState('')

  const [form, setForm] = useState({ title: '', description: '' })

  const loadItems = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!isTokenValid()) {
      onReauth?.()

      return
    }

    setLoading(true)
    try {
      await ensureTimesheetsSheet(settings.spreadsheetId)

      const data = await fetchTimesheets(settings.spreadsheetId)

      setItems(data)
    } catch (err) {
      if (handleSheetError(err, { onReauth, fallbackMessage: 'خطا در بارگذاری تایم‌شیت‌ها' }))
        return
    } finally {
      setLoading(false)
    }
  }, [onReauth])

  useEffect(() => {
    if (isConfigured()) loadItems()
  }, [loadItems, dataRevision])

  const openCreateForm = useCallback(() => {
    setEditingItem(null)
    setForm({ title: '', description: '' })
    setShowForm(true)
  }, [])

  const openEditForm = useCallback((item: TimesheetWithRow) => {
    setEditingItem(item)
    setForm({ title: item.title, description: item.description })
    setShowForm(true)
  }, [])

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery)
    setFilterModalOpen(true)
  }, [searchQuery])

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportTimesheetsCsv,
      exportPdfFn: exportTimesheetsPdf,
      importFn: importTimesheetsCsv,
      onComplete: loadItems,
      onReauth
    })

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim()

    if (!query) return items

    return items.filter(item => matchSearch(query, item.title, item.description))
  }, [items, searchQuery])

  const filterChips = useMemo(
    () => compactFilterChips([buildSearchChip(searchQuery, () => setSearchQuery(''))]),
    [searchQuery]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }
    if (!form.title.trim()) {
      showError('عنوان الزامی است')

      return
    }

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingItem) {
        await updateTimesheet(settings.spreadsheetId, editingItem.rowNumber, {
          ...editingItem,
          title: form.title.trim(),
          description: form.description.trim()
        })
        showSuccess('تایم‌شیت ویرایش شد')
      } else {
        await createTimesheet(settings.spreadsheetId, {
          title: form.title.trim(),
          description: form.description.trim()
        })
        showSuccess('تایم‌شیت ایجاد شد')
      }
      setShowForm(false)
      await loadItems()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در ذخیره')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem || !isConfigured() || !isTokenValid()) return

    const settings = getSettings()!

    setDeleting(true)
    try {
      await deleteTimesheet(settings.spreadsheetId, deletingItem.rowNumber, deletingItem.id)
      showSuccess('تایم‌شیت حذف شد')
      setDeletingItem(null)
      await loadItems()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در حذف')
    } finally {
      setDeleting(false)
    }
  }

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات تایم‌شیت‌ها',
      actions: createPageSpeedDialActions({
        onAdd: openCreateForm,
        onFilter: openFilterModal,
        onRefresh: loadItems,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf
      })
    }),
    [
      openCreateForm,
      openFilterModal,
      loadItems,
      loading,
      handleImport,
      handleExport,
      handleExportPdf
    ]
  )

  return {
    items,
    showForm,
    setShowForm,
    editingItem,
    deletingItem,
    setDeletingItem,
    loading,
    saving,
    deleting,
    searchQuery,
    setSearchQuery,
    filterModalOpen,
    setFilterModalOpen,
    draftSearch,
    setDraftSearch,
    form,
    setForm,
    loadItems,
    openCreateForm,
    openEditForm,
    openFilterModal,
    filteredItems,
    filterChips,
    handleSubmit,
    handleDelete,
    pageSpeedDialConfig,
    importExportConfirmModal
  }
}
