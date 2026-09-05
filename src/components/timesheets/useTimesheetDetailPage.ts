import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  deleteTimesheetEntryItem,
  submitTimesheetEntry,
  toggleTimesheetEntryChecked
} from './timesheetEntryMutations'
import { useTimesheetEntryFilters } from './useTimesheetEntryFilters'
import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import {
  ensureTimesheetEntriesSheet,
  exportTimesheetEntriesCsv,
  exportTimesheetEntriesPdf,
  fetchTimesheetEntries,
  importTimesheetEntriesCsv,
  totalDurationMinutes
} from '../../services/timesheet'
import type { Timesheet, TimesheetEntry } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import {
  calcDurationMinutes,
  getNowDateTimeIso,
  addMinutesToDateTime,
  syncEndDateTimeFromStart,
  clampDateTimeToMin
} from '../../utils/datetime'
import { handleSheetError } from '../../utils/sheetError'

export type TimesheetEntryWithRow = TimesheetEntry & { rowNumber: number }

export function useTimesheetDetailPage(timesheet: Timesheet) {
  const [items, setItems] = useState<TimesheetEntryWithRow[]>([])

  const [showForm, setShowForm] = useState(false)

  const [editingItem, setEditingItem] = useState<TimesheetEntryWithRow | null>(null)

  const [deletingItem, setDeletingItem] = useState<TimesheetEntryWithRow | null>(null)

  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const [togglingCheckId, setTogglingCheckId] = useState('')

  const [endPickerOpenToken, setEndPickerOpenToken] = useState(0)

  const dataRevision = useDataRefresh()

  const filters = useTimesheetEntryFilters(items)

  const [form, setForm] = useState({
    title: '',
    startAt: getNowDateTimeIso(),
    endAt: getNowDateTimeIso(),
    description: ''
  })

  const durationMinutes = useMemo(
    () => calcDurationMinutes(form.startAt, form.endAt),
    [form.startAt, form.endAt]
  )

  const totalMinutes = useMemo(
    () => totalDurationMinutes(filters.filteredItems),
    [filters.filteredItems]
  )

  const loadItems = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!requireAuth()) return

    setLoading(true)
    try {
      await ensureTimesheetEntriesSheet(settings.spreadsheetId)

      const data = await fetchTimesheetEntries(settings.spreadsheetId, timesheet.id)

      setItems(data)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری رکوردها' })) return
    } finally {
      setLoading(false)
    }
  }, [timesheet.id])

  useEffect(() => {
    if (isConfigured()) loadItems()
  }, [loadItems, dataRevision])

  const openCreateForm = useCallback(() => {
    const now = getNowDateTimeIso()

    setEditingItem(null)
    setForm({
      title: '',
      startAt: now,
      endAt: addMinutesToDateTime(now, 60),
      description: ''
    })
    setShowForm(true)
  }, [])

  const openEditForm = useCallback((item: TimesheetEntryWithRow) => {
    setEditingItem(item)
    setForm({
      title: item.title,
      startAt: item.startAt,
      endAt: item.endAt,
      description: item.description
    })
    setShowForm(true)
  }, [])

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: spreadsheetId =>
        exportTimesheetEntriesCsv(spreadsheetId, timesheet.id, `${timesheet.title}.csv`),
      exportPdfFn: spreadsheetId =>
        exportTimesheetEntriesPdf(spreadsheetId, timesheet.id, timesheet.title),
      importFn: (spreadsheetId, csvContent) =>
        importTimesheetEntriesCsv(spreadsheetId, timesheet.id, csvContent),
      onComplete: loadItems
    })

  const handleStartChange = (startAt: string) => {
    setForm(prev => ({
      ...prev,
      startAt,
      endAt: syncEndDateTimeFromStart(startAt, prev.endAt, prev.startAt)
    }))
    setEndPickerOpenToken(token => token + 1)
  }

  const handleEndChange = (endAt: string) => {
    setForm(prev => ({
      ...prev,
      endAt: clampDateTimeToMin(endAt, prev.startAt)
    }))
  }

  const handleToggleChecked = async (item: TimesheetEntryWithRow, checked: boolean) => {
    setTogglingCheckId(item.id)
    try {
      await toggleTimesheetEntryChecked({
        item,
        checked,
        onUpdated: (entry, nextChecked) => {
          setItems(current =>
            current.map(row => (row.id === entry.id ? { ...row, checked: nextChecked } : row))
          )
        }
      })
    } finally {
      setTogglingCheckId('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)
    try {
      await submitTimesheetEntry({
        timesheet,
        editingItem,
        form,
        durationMinutes,
        onSuccess: async () => {
          setShowForm(false)
          await loadItems()
        }
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    setDeleting(true)
    try {
      await deleteTimesheetEntryItem({
        deletingItem,
        onSuccess: async () => {
          setDeletingItem(null)
          await loadItems()
        }
      })
    } finally {
      setDeleting(false)
    }
  }

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: `عملیات ${timesheet.title}`,
      actions: createPageSpeedDialActions({
        onAdd: openCreateForm,
        onFilter: filters.openFilterModal,
        onRefresh: loadItems,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf
      })
    }),
    [
      timesheet.title,
      openCreateForm,
      filters.openFilterModal,
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
    togglingCheckId,
    endPickerOpenToken,
    form,
    setForm,
    durationMinutes,
    loadItems,
    openCreateForm,
    openEditForm,
    totalMinutes,
    handleStartChange,
    handleEndChange,
    handleToggleChecked,
    handleSubmit,
    handleDelete,
    pageSpeedDialConfig,
    importExportConfirmModal,
    ...filters
  }
}
