import { useState, useEffect, useCallback, useMemo } from 'react'

import ActiveFilterChips from './ActiveFilterChips'
import AmountInput from './AmountInput'
import AppIcon from './AppIcon'
import CardDeleteButton from './CardDeleteButton'
import CardEditButton from './CardEditButton'
import ConfirmActionModal from './ConfirmActionModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import { createAllDateRangeFilter, type DateRangeFilterPreset } from './DateRangeFilter'
import FilterModal from './FilterModal'
import { FormField } from './form'
import FormModal from './FormModal'
import JalaliDatePicker from './JalaliDatePicker'
import PageFilterPanel, { type PaymentStatusFilter } from './PageFilterPanel'
import SearchEmptyState from './SearchEmptyState'
import { DangCardListSkeleton } from './skeleton'
import StatCard from './StatCard'
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions'
import { useDataRefresh } from '../hooks/useDataRefresh'
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../hooks/useSheetImportExport'
import { isTokenValid } from '../services/auth'
import {
  createCheck,
  deleteCheck,
  ensureChecksSheet,
  exportChecksCsv,
  exportChecksPdf,
  fetchChecks,
  importChecksCsv,
  sortChecks,
  toggleCheckPaid,
  totalChecksInRange,
  totalUnpaidChecksInRange,
  updateCheck
} from '../services/checks'
import { getSettings, isConfigured } from '../services/settings'
import { hasStoreData } from '../services/spreadsheetStore'
import type { Check } from '../types'
import {
  formatDateRangeLabel,
  formatJalaliMonthLabel,
  getInstallmentDueRange,
  getJalaliMonthKey,
  isDateInRange,
  resolveDateRange
} from '../utils/dateRange'
import {
  buildDateRangeChip,
  buildPaymentStatusChip,
  buildSearchChip,
  compactFilterChips
} from '../utils/filterChips'
import { formatMoney } from '../utils/formatMoney'
import { formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate'
import { matchSearch } from '../utils/search'
import { distributionSparkline } from '../utils/sparklineData'
import { showError, showSuccess } from '../utils/toast'

type CheckWithRow = Check & { rowNumber: number }

export default function ChecksPage({
  onReauth,
  active = true
}: {
  onReauth?: () => void
  active?: boolean
}) {
  const [items, setItems] = useState<CheckWithRow[]>([])

  const [showForm, setShowForm] = useState(false)

  const [editingItem, setEditingItem] = useState<CheckWithRow | null>(null)

  const [deletingItem, setDeletingItem] = useState<CheckWithRow | null>(null)

  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const [togglingId, setTogglingId] = useState('')

  const dataRevision = useDataRefresh()

  const [searchQuery, setSearchQuery] = useState('')

  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const [draftSearch, setDraftSearch] = useState('')

  const [draftPaymentStatus, setDraftPaymentStatus] = useState<PaymentStatusFilter>('all')

  const [draftDatePreset, setDraftDatePreset] = useState<DateRangeFilterPreset>(
    () => createAllDateRangeFilter().preset
  )

  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createAllDateRangeFilter().customRange
  )

  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all')

  const [datePreset, setDatePreset] = useState<DateRangeFilterPreset>(
    () => createAllDateRangeFilter().preset
  )

  const [customRange, setCustomRange] = useState(() => createAllDateRangeFilter().customRange)

  const [form, setForm] = useState({
    checkNumber: '',
    counterparty: '',
    amount: '' as number | '',
    creationDate: getTodayIso(),
    dueDate: getTodayIso()
  })

  const loadItems = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!isTokenValid()) {
      onReauth?.()

      return
    }

    setLoading(true)
    try {
      await ensureChecksSheet(settings.spreadsheetId)

      const data = await fetchChecks(settings.spreadsheetId)

      setItems(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری چک‌ها'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }

    if (!form.checkNumber.trim()) {
      showError('شماره چک الزامی است')

      return
    }
    if (!form.counterparty.trim()) {
      showError('طرف حساب الزامی است')

      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showError('مبلغ را وارد کنید')

      return
    }
    if (!form.creationDate) {
      showError('تاریخ صدور الزامی است')

      return
    }
    if (!form.dueDate) {
      showError('تاریخ سررسید الزامی است')

      return
    }

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingItem) {
        const updated: Check = {
          ...editingItem,
          checkNumber: form.checkNumber.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          creationDate: form.creationDate,
          dueDate: form.dueDate
        }

        await updateCheck(settings.spreadsheetId, editingItem.rowNumber, updated)
        showSuccess('چک ویرایش شد')
      } else {
        await createCheck(settings.spreadsheetId, {
          checkNumber: form.checkNumber.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          creationDate: form.creationDate,
          dueDate: form.dueDate
        })
        showSuccess('چک جدید ثبت شد')
      }
      closeForm()
      await loadItems()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : editingItem ? 'خطا در ویرایش چک' : 'خطا در ثبت چک'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePaid = async (item: CheckWithRow, paid: boolean) => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return
    }

    setTogglingId(item.id)
    try {
      const updated = await toggleCheckPaid(settings.spreadsheetId, item, paid)

      setItems(prev =>
        sortChecks(
          prev.map(c => (c.id === item.id ? { ...updated, rowNumber: item.rowNumber } : c))
        )
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در به‌روزرسانی'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setTogglingId('')
    }
  }

  const monthRange = useMemo(() => getInstallmentDueRange('month-to-date'), [])

  const monthLabel = useMemo(() => formatJalaliMonthLabel(getJalaliMonthKey(getTodayIso())), [])

  const dateRange = useMemo(
    () => (datePreset === 'all' ? null : resolveDateRange(datePreset, customRange)),
    [datePreset, customRange]
  )

  const monthTotals = useMemo(
    () => ({
      total: totalChecksInRange(items, monthRange),
      unpaid: totalUnpaidChecksInRange(items, monthRange)
    }),
    [items, monthRange]
  )

  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        if (
          !matchSearch(
            searchQuery,
            item.checkNumber,
            item.counterparty,
            item.amount,
            item.creationDate,
            item.dueDate
          )
        ) {
          return false
        }

        if (dateRange && !isDateInRange(item.dueDate, dateRange)) {
          return false
        }

        if (paymentStatusFilter === 'paid' && !item.paid) return false
        if (paymentStatusFilter === 'unpaid' && item.paid) return false

        return true
      }),
    [items, searchQuery, dateRange, paymentStatusFilter]
  )

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery)
    setDraftPaymentStatus(paymentStatusFilter)
    setDraftDatePreset(datePreset)
    setDraftCustomRange(customRange)
    setFilterModalOpen(true)
  }, [searchQuery, paymentStatusFilter, datePreset, customRange])

  const resetDateFilter = useCallback(() => {
    const defaults = createAllDateRangeFilter()

    setDatePreset(defaults.preset)
    setCustomRange(defaults.customRange)
  }, [])

  const filterChips = useMemo(
    () =>
      compactFilterChips([
        buildSearchChip(searchQuery, () => setSearchQuery('')),
        paymentStatusFilter !== 'all' &&
          buildPaymentStatusChip(paymentStatusFilter, () => setPaymentStatusFilter('all')),
        datePreset !== 'all' &&
          dateRange &&
          buildDateRangeChip(formatDateRangeLabel(dateRange), resetDateFilter)
      ]),
    [searchQuery, paymentStatusFilter, datePreset, dateRange, resetDateFilter]
  )

  const clearDraftFilters = () => {
    const defaults = createAllDateRangeFilter()

    setDraftSearch('')
    setDraftPaymentStatus('all')
    setDraftDatePreset(defaults.preset)
    setDraftCustomRange(defaults.customRange)
  }

  const resetCreateForm = () => {
    setForm({
      checkNumber: '',
      counterparty: '',
      amount: '',
      creationDate: getTodayIso(),
      dueDate: getTodayIso()
    })
  }

  const openCreateForm = () => {
    setEditingItem(null)
    resetCreateForm()
    setShowForm(true)
  }

  const openEditForm = (item: CheckWithRow) => {
    setEditingItem(item)
    setForm({
      checkNumber: item.checkNumber,
      counterparty: item.counterparty,
      amount: item.amount,
      creationDate: item.creationDate,
      dueDate: item.dueDate
    })
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
    resetCreateForm()
  }

  const openDeleteConfirm = (item: CheckWithRow) => {
    setDeletingItem(item)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingItem(null)
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return
    }

    setDeleting(true)
    try {
      await deleteCheck(settings.spreadsheetId, deletingItem.rowNumber, deletingItem)
      setDeletingItem(null)
      showSuccess('چک حذف شد')
      await loadItems()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف چک'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setDeleting(false)
    }
  }

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportChecksCsv,
      exportPdfFn: exportChecksPdf,
      importFn: importChecksCsv,
      onComplete: loadItems,
      onReauth
    })

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات چک‌ها',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        onFilter: openFilterModal,
        onRefresh: loadItems,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf
      })
    }),
    [openFilterModal, loadItems, loading, handleImport, handleExport, handleExportPdf]
  )

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active)

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="checks" />
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
          setPaymentStatusFilter(draftPaymentStatus)
          setDatePreset(draftDatePreset)
          setCustomRange(draftCustomRange)
          setFilterModalOpen(false)
        }}
        onClear={clearDraftFilters}
      >
        <PageFilterPanel
          search={draftSearch}
          onSearchChange={setDraftSearch}
          searchPlaceholder="جستجو در چک‌ها..."
          paymentStatus={draftPaymentStatus}
          onPaymentStatusChange={setDraftPaymentStatus}
          datePreset={draftDatePreset}
          customRange={draftCustomRange}
          onDateFilterChange={filter => {
            setDraftDatePreset(filter.preset)
            setDraftCustomRange(filter.customRange)
          }}
          dateIncludeAll
          dateLabel="بازه زمانی (سررسید)"
          dateLoading={loading}
        />
      </FilterModal>

      {loading && items.length === 0 ? (
        <DangCardListSkeleton />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <AppIcon name="checks" />
          </div>
          <p>هنوز چکی ثبت نشده</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        <>
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`card dang-card interactive-card${item.paid ? ' paid' : ''}`}
            >
              <input
                type="checkbox"
                className="dang-checkbox"
                checked={item.paid}
                disabled={togglingId === item.id}
                onChange={e => handleTogglePaid(item, e.target.checked)}
              />
              <div className="dang-card-body">
                <div className="dang-card-header">
                  <span className="dang-card-title">چک {item.checkNumber}</span>
                  <span className="dang-card-amount" dir="ltr">
                    {formatMoney(item.amount)}
                  </span>
                </div>
                <div className="dang-card-meta">طرف حساب: {item.counterparty}</div>
                <div className="dang-card-meta">
                  {item.creationDate && (
                    <span>صدور: {formatIsoDatePersian(item.creationDate)}</span>
                  )}
                  {item.dueDate && (
                    <span className="dang-card-date">
                      · سررسید: {formatIsoDatePersian(item.dueDate)}
                    </span>
                  )}
                </div>
                {item.paid && item.paidAt && (
                  <p className="dang-paid-at">در {item.paidAt} پرداخت شده</p>
                )}
              </div>
              <div className="card-action-buttons">
                <CardEditButton onClick={() => openEditForm(item)} />
                <CardDeleteButton onClick={() => openDeleteConfirm(item)} />
              </div>
            </div>
          ))}

          <div className="stat-grid dashboard-stat-grid">
            <StatCard
              label={`مجموع چک‌های ${monthLabel}`}
              amount={monthTotals.total}
              variant="default"
              tone="primary"
              sparklineData={distributionSparkline(items.map(item => item.amount))}
              animateIndex={0}
              lift
            />
            <StatCard
              label="پرداخت‌نشده تا پایان ماه"
              amount={monthTotals.unpaid}
              variant="expense"
              sparklineData={distributionSparkline(
                items.filter(item => !item.paid).map(item => item.amount)
              )}
              animateIndex={1}
              lift
            />
          </div>
        </>
      )}

      <FormModal
        open={showForm}
        title={editingItem ? 'ویرایش چک' : 'ثبت چک جدید'}
        onClose={closeForm}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره چک'}
      >
        <FormField label="شماره چک" required>
          <input
            type="text"
            value={form.checkNumber}
            onChange={e => setForm(f => ({ ...f, checkNumber: e.target.value }))}
            placeholder="شماره چک"
            dir="ltr"
          />
        </FormField>

        <FormField label="طرف حساب" required>
          <input
            type="text"
            value={form.counterparty}
            onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))}
            placeholder="نام طرف حساب"
          />
        </FormField>

        <FormField label="مبلغ" required>
          <AmountInput
            value={form.amount}
            onChange={val => setForm(f => ({ ...f, amount: val }))}
          />
        </FormField>

        <FormField label="تاریخ صدور" required>
          <JalaliDatePicker
            value={form.creationDate}
            onChange={date => setForm(f => ({ ...f, creationDate: date }))}
          />
        </FormField>

        <FormField label="تاریخ سررسید" required>
          <JalaliDatePicker
            value={form.dueDate}
            onChange={date => setForm(f => ({ ...f, dueDate: date }))}
          />
        </FormField>
      </FormModal>

      <ConfirmActionModal {...importExportConfirmModal} />

      <ConfirmDeleteModal
        open={deletingItem !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  )
}
