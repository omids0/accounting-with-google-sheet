import { useCallback, useEffect, useMemo, useState } from 'react'

import ActiveFilterChips from './ActiveFilterChips'
import AppIcon from './AppIcon'
import CardDeleteButton from './CardDeleteButton'
import CardEditButton from './CardEditButton'
import ConfirmActionModal from './ConfirmActionModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import FilterModal from './FilterModal'
import FormModal from './FormModal'
import SearchEmptyState from './SearchEmptyState'
import { InstallmentCardListSkeleton } from './skeleton'
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions'
import { useDataRefresh } from '../hooks/useDataRefresh'
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../hooks/useSheetImportExport'
import { isTokenValid } from '../services/auth'
import { getSettings, isConfigured } from '../services/settings'
import { hasStoreData } from '../services/spreadsheetStore'
import {
  createTimesheet,
  deleteTimesheet,
  ensureTimesheetsSheet,
  exportTimesheetsCsv,
  exportTimesheetsPdf,
  fetchTimesheets,
  importTimesheetsCsv,
  updateTimesheet
} from '../services/timesheet'
import type { Timesheet } from '../types'
import { buildSearchChip, compactFilterChips } from '../utils/filterChips'
import { matchSearch } from '../utils/search'
import { showError, showSuccess } from '../utils/toast'
import FormField from './form/FormField'

type TimesheetWithRow = Timesheet & { rowNumber: number }

export default function TimesheetsPage({
  onReauth,
  active = true,
  onOpenTimesheet
}: {
  onReauth?: () => void
  active?: boolean
  onOpenTimesheet: (timesheet: Timesheet) => void
}) {
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
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری تایم‌شیت‌ها'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
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

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active)

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="clock" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div>
      <ActiveFilterChips chips={filterChips} onChipClick={openFilterModal} />

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={() => {
          setSearchQuery(draftSearch)
          setFilterModalOpen(false)
        }}
        onClear={() => setDraftSearch('')}
      >
        <FormField label="جستجو">
          <input
            type="search"
            className="form-control"
            value={draftSearch}
            onChange={e => setDraftSearch(e.target.value)}
            placeholder="جستجو در تایم‌شیت‌ها..."
          />
        </FormField>
      </FilterModal>

      {loading && items.length === 0 ? (
        <InstallmentCardListSkeleton footerStats={0} />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <AppIcon name="clock" />
          </div>
          <p>هنوز تایم‌شیتی ثبت نشده</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreateForm}>
            افزودن تایم‌شیت
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        filteredItems.map(item => (
          <div
            key={item.id}
            className="card installment-card interactive-card timesheet-list-card"
            role="button"
            tabIndex={0}
            aria-label={`مشاهده رکوردهای ${item.title}`}
            onClick={() => onOpenTimesheet(item)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpenTimesheet(item)
              }
            }}
          >
            <div className="card-header-with-edit">
              <div className="installment-header timesheet-list-card-main">
                <div>
                  <div className="list-card-title">{item.title}</div>
                  {item.description && <div className="list-card-subtitle">{item.description}</div>}
                </div>
              </div>
              <div
                className="card-action-buttons"
                role="group"
                onPointerDown={event => event.stopPropagation()}
              >
                <CardEditButton
                  onClick={event => {
                    event.stopPropagation()
                    openEditForm(item)
                  }}
                />
                <CardDeleteButton
                  onClick={event => {
                    event.stopPropagation()
                    setDeletingItem(item)
                  }}
                />
              </div>
            </div>
          </div>
        ))
      )}

      <FormModal
        open={showForm}
        title={editingItem ? 'ویرایش تایم‌شیت' : 'تایم‌شیت جدید'}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingItem ? 'ذخیره' : 'ایجاد'}
      >
        <FormField label="عنوان" required>
          <input
            type="text"
            className="form-control"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="مثلاً: پروژه الف"
            autoFocus
          />
        </FormField>
        <FormField label="توضیحات" className="form-field-note">
          <textarea
            className="form-control form-note-textarea"
            rows={3}
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="توضیحات اضافه..."
          />
        </FormField>
      </FormModal>

      <ConfirmDeleteModal
        open={deletingItem !== null}
        title="حذف تایم‌شیت"
        message={`آیا از حذف «${deletingItem?.title ?? ''}» و تمام رکوردهای آن اطمینان دارید؟`}
        deleting={deleting}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
      />

      <ConfirmActionModal {...importExportConfirmModal} />
    </div>
  )
}
