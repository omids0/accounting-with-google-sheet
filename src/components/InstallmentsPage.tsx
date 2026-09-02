import { useState, useEffect, useCallback, useMemo } from 'react'

import ActiveFilterChips from './ActiveFilterChips'
import AmountInput from './AmountInput'
import AppIcon from './AppIcon'
import ConfirmActionModal from './ConfirmActionModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import { createDefaultDateRangeFilter } from './DateRangeFilter'
import FilterModal from './FilterModal'
import { FormField } from './form'
import FormModal from './FormModal'
import InstallmentPlanCard, { type PlanWithRow } from './InstallmentPlanCard'
import JalaliDatePicker from './JalaliDatePicker'
import PageFilterPanel from './PageFilterPanel'
import SearchEmptyState from './SearchEmptyState'
import { InstallmentCardListSkeleton } from './skeleton'
import StatCard from './StatCard'
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions'
import { useDataRefresh } from '../hooks/useDataRefresh'
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../hooks/useSheetImportExport'
import { isTokenValid } from '../services/auth'
import {
  createInstallmentPlan,
  ensureInstallmentsSheet,
  exportInstallmentsCsv,
  exportInstallmentsPdf,
  fetchInstallmentPlans,
  INSTALLMENTS_SHEET,
  getInstallmentEndDate,
  getPaidUntilFromPlan,
  getRemovedPaymentTransactionIds,
  importInstallmentsCsv,
  isInstallmentPlanVisible,
  isInstallmentPlanComplete,
  getInstallmentDueDateInRange,
  paidInstallmentAmount,
  reconcilePaymentsOnEdit,
  sortInstallmentPlans,
  toggleInstallmentPayment,
  updateInstallmentPaymentAmount,
  getInstallmentPaymentAmount,
  totalInstallmentsInRange,
  totalInstallmentAmount,
  totalUnpaidInstallments,
  deleteInstallmentPlan,
  updateInstallmentPlan
} from '../services/installments'
import { deleteLinkedExpenseRecord } from '../services/paymentTransactions'
import { getSettings, isConfigured } from '../services/settings'
import { hasStoreData, getSheetAllRows } from '../services/spreadsheetStore'
import {
  formatDateRangeLabel,
  formatJalaliMonthLabel,
  getInstallmentDueRange,
  getJalaliMonthKey,
  resolveDateRange,
  type RecordsDatePreset
} from '../utils/dateRange'
import { buildDateRangeChip, buildSearchChip, compactFilterChips } from '../utils/filterChips'
import { formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate'
import { matchSearch } from '../utils/search'
import { distributionSparkline } from '../utils/sparklineData'
import { showError, showSuccess } from '../utils/toast'

export default function InstallmentsPage({
  onReauth,
  active = true
}: {
  onReauth?: () => void
  active?: boolean
}) {
  const [plans, setPlans] = useState<PlanWithRow[]>([])

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)

  const [editingPlan, setEditingPlan] = useState<PlanWithRow | null>(null)

  const [deletingPlan, setDeletingPlan] = useState<PlanWithRow | null>(null)

  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const [togglingKey, setTogglingKey] = useState('')

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

  const dataRevision = useDataRefresh()

  const [form, setForm] = useState({
    title: '',
    amount: '' as number | '',
    count: '' as number | '',
    dueDay: '' as number | '',
    startDate: getTodayIso(),
    paidUntil: '',
    note: ''
  })

  const computedEndDate = useMemo(() => {
    const count = Number(form.count)

    const dueDay = Number(form.dueDay)

    if (!form.startDate || !count || count < 1 || !dueDay) return ''

    return getInstallmentEndDate(form.startDate, count, dueDay)
  }, [form.startDate, form.count, form.dueDay])

  const loadPlans = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!isTokenValid()) {
      onReauth?.()

      return
    }

    const hasCachedSheet = !!getSheetAllRows(settings.spreadsheetId, INSTALLMENTS_SHEET)

    if (!hasCachedSheet) {
      setLoading(true)
    }
    try {
      if (!hasCachedSheet) {
        await ensureInstallmentsSheet(settings.spreadsheetId)
      }

      const data = await fetchInstallmentPlans(settings.spreadsheetId)

      setPlans(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری اقساط'

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
    if (isConfigured()) loadPlans()
  }, [loadPlans, dataRevision])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }

    if (!form.title.trim()) {
      showError('عنوان قسط الزامی است')

      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showError('مبلغ قسط را وارد کنید')

      return
    }
    if (!form.count || Number(form.count) < 1) {
      showError('تعداد بازپرداخت باید حداقل ۱ باشد')

      return
    }

    const dueDay = Number(form.dueDay)

    if (!dueDay || dueDay < 1 || dueDay > 31) {
      showError('موعد قسط باید بین ۱ تا ۳۱ باشد')

      return
    }
    if (!form.startDate) {
      showError('تاریخ شروع قسط الزامی است')

      return
    }
    if (form.paidUntil && form.paidUntil < form.startDate) {
      showError('تاریخ پرداخت‌شده نمی‌تواند قبل از تاریخ شروع باشد')

      return
    }
    if (form.paidUntil && computedEndDate && form.paidUntil > computedEndDate) {
      showError('تاریخ پرداخت‌شده نمی‌تواند بعد از تاریخ پایان قسط باشد')

      return
    }

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingPlan) {
        const reconciled = reconcilePaymentsOnEdit(editingPlan, {
          title: form.title.trim(),
          amount: Number(form.amount),
          count: Number(form.count),
          dueDay,
          startDate: form.startDate,
          paidUntil: form.paidUntil,
          note: form.note.trim()
        })

        if ('error' in reconciled) {
          showError(reconciled.error)

          return
        }

        const removedTransactionIds = getRemovedPaymentTransactionIds(
          editingPlan.payments,
          reconciled.payments
        )

        for (const transactionRecordId of removedTransactionIds) {
          await deleteLinkedExpenseRecord(settings.spreadsheetId, transactionRecordId)
        }
        await updateInstallmentPlan(settings.spreadsheetId, editingPlan.rowNumber, reconciled)
        showSuccess('قسط ویرایش شد')
      } else {
        await createInstallmentPlan(settings.spreadsheetId, {
          title: form.title.trim(),
          amount: Number(form.amount),
          count: Number(form.count),
          dueDay,
          startDate: form.startDate,
          paidUntil: form.paidUntil,
          note: form.note.trim()
        })
        showSuccess('قسط جدید ثبت شد')
      }
      closeForm()
      await loadPlans()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : editingPlan ? 'خطا در ویرایش قسط' : 'خطا در ثبت قسط'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePayment = useCallback(
    async (plan: PlanWithRow, paymentIndex: number, paid: boolean) => {
      const settings = getSettings()

      if (!settings?.spreadsheetId || !isTokenValid()) {
        onReauth?.()

        return
      }

      const key = `${plan.id}-${paymentIndex}`

      setTogglingKey(key)
      try {
        const updated = await toggleInstallmentPayment(
          settings.spreadsheetId,
          plan,
          paymentIndex,
          paid
        )

        setPlans(prev =>
          prev.map(p => (p.id === plan.id ? { ...updated, rowNumber: plan.rowNumber } : p))
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در بروزرسانی پرداخت'

        if (msg.includes('منقضی') || msg.includes('401')) {
          onReauth?.()

          return
        }
        showError(msg)
      } finally {
        setTogglingKey('')
      }
    },
    [onReauth]
  )

  const handlePaymentAmountSave = useCallback(
    async (plan: PlanWithRow, paymentIndex: number, nextAmount: number) => {
      const payment = plan.payments[paymentIndex]

      if (!payment) return

      const currentAmount = getInstallmentPaymentAmount(payment, plan)

      if (nextAmount === currentAmount) return

      const settings = getSettings()

      if (!settings?.spreadsheetId || !isTokenValid()) {
        onReauth?.()

        return
      }

      try {
        const updated = await updateInstallmentPaymentAmount(
          settings.spreadsheetId,
          plan,
          paymentIndex,
          nextAmount
        )

        const updatedPlan = { ...updated, rowNumber: plan.rowNumber }

        setPlans(prev => prev.map(p => (p.id === plan.id ? updatedPlan : p)))
        showSuccess('مبلغ قسط ذخیره شد')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در به‌روزرسانی مبلغ'

        if (msg.includes('منقضی') || msg.includes('401')) {
          onReauth?.()

          return
        }
        showError(msg)
        throw err
      }
    },
    [onReauth]
  )

  const resetCreateForm = useCallback(() => {
    setForm({
      title: '',
      amount: '',
      count: '',
      dueDay: '',
      startDate: getTodayIso(),
      paidUntil: '',
      note: ''
    })
  }, [])

  const openCreateForm = useCallback(() => {
    setEditingPlan(null)
    resetCreateForm()
    setShowForm(true)
  }, [resetCreateForm])

  const openEditForm = useCallback((plan: PlanWithRow) => {
    setEditingPlan(plan)
    setForm({
      title: plan.title,
      amount: plan.amount,
      count: plan.count,
      dueDay: plan.dueDay,
      startDate: plan.startDate || getTodayIso(),
      paidUntil: getPaidUntilFromPlan(plan),
      note: plan.note
    })
    setShowForm(true)
  }, [])

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingPlan(null)
    resetCreateForm()
  }

  const openDeleteConfirm = useCallback((plan: PlanWithRow) => {
    setDeletingPlan(plan)
  }, [])

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingPlan(null)
  }

  const handleDelete = async () => {
    if (!deletingPlan) return

    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return
    }

    setDeleting(true)
    try {
      await deleteInstallmentPlan(settings.spreadsheetId, deletingPlan.rowNumber, deletingPlan)
      if (expandedId === deletingPlan.id) setExpandedId(null)
      setDeletingPlan(null)
      showSuccess('قسط حذف شد')
      await loadPlans()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف قسط'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleExpand = useCallback((planId: string) => {
    setExpandedId(prev => (prev === planId ? null : planId))
  }, [])

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

        return { plan, done, complete, progress, dueDate }
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

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportInstallmentsCsv,
      exportPdfFn: exportInstallmentsPdf,
      importFn: importInstallmentsCsv,
      onComplete: loadPlans,
      onReauth
    })

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

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات اقساط',
      actions: createPageSpeedDialActions({
        onAdd: openCreateForm,
        onFilter: openFilterModal,
        onRefresh: loadPlans,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf
      })
    }),
    [
      openFilterModal,
      openCreateForm,
      loadPlans,
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
          <AppIcon name="installments" />
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
          setDatePreset(draftDatePreset)
          setCustomRange(draftCustomRange)
          setFilterModalOpen(false)
        }}
        onClear={() => {
          const defaults = createDefaultDateRangeFilter()

          setDraftSearch('')
          setDraftDatePreset(defaults.preset as RecordsDatePreset)
          setDraftCustomRange(defaults.customRange)
        }}
      >
        <PageFilterPanel
          search={draftSearch}
          onSearchChange={setDraftSearch}
          searchPlaceholder="جستجو در اقساط..."
          datePreset={draftDatePreset}
          customRange={draftCustomRange}
          onDateFilterChange={filter => {
            if (filter.preset === 'all') return
            setDraftDatePreset(filter.preset)
            setDraftCustomRange(filter.customRange)
          }}
          dateLabel="بازه زمانی (سررسید)"
          dateLoading={loading}
        />
      </FilterModal>

      {loading && plans.length === 0 ? (
        <InstallmentCardListSkeleton filterChips={1} footerStats={2} />
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <AppIcon name="installments" />
          </div>
          <p>هنوز قسطی ثبت نشده</p>
        </div>
      ) : monthPlans.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <AppIcon name="installments" />
          </div>
          <p>هیچ قسطی برای {monthLabel} نیست</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <SearchEmptyState />
      ) : (
        displayPlans.map(({ plan, done, complete, progress, dueDate }) => {
          const togglingPaymentIndex = togglingKey.startsWith(`${plan.id}-`)
            ? Number(togglingKey.slice(plan.id.length + 1))
            : null

          return (
            <InstallmentPlanCard
              key={plan.id}
              plan={plan}
              expanded={expandedId === plan.id}
              done={done}
              complete={complete}
              progress={progress}
              dueDate={dueDate}
              togglingPaymentIndex={togglingPaymentIndex}
              onToggleExpand={handleToggleExpand}
              onEdit={openEditForm}
              onDelete={openDeleteConfirm}
              onTogglePayment={handleTogglePayment}
              onPaymentAmountSave={handlePaymentAmountSave}
            />
          )
        })
      )}

      {plans.length > 0 && (
        <div className="stat-grid dashboard-stat-grid">
          <StatCard
            label={`مجموع اقساط ${monthLabel}`}
            amount={monthTotals.total}
            variant="default"
            tone="primary"
            sparklineData={monthAmountSparkline}
            animateIndex={0}
            animated={false}
            lift
          />
          <StatCard
            label="پرداخت‌نشده این ماه"
            amount={monthTotals.unpaid}
            variant="expense"
            sparklineData={monthUnpaidSparkline}
            animateIndex={1}
            animated={false}
            lift
          />
        </div>
      )}

      <FormModal
        open={showForm}
        title={editingPlan ? 'ویرایش قسط' : 'ثبت قسط جدید'}
        onClose={closeForm}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingPlan ? 'ذخیره تغییرات' : 'ذخیره قسط'}
      >
        <FormField label="عنوان قسط" required>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="مثلاً: وام بانکی"
          />
        </FormField>

        <FormField label="مبلغ قسط" required>
          <AmountInput
            value={form.amount}
            onChange={val => setForm(f => ({ ...f, amount: val }))}
          />
        </FormField>

        <FormField label="تعداد بازپرداخت" required>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={form.count === '' ? '' : form.count}
            onChange={e =>
              setForm(f => ({
                ...f,
                count: e.target.value === '' ? '' : Number(e.target.value)
              }))
            }
            dir="ltr"
          />
        </FormField>

        <FormField label="تاریخ شروع قسط" required>
          <JalaliDatePicker
            value={form.startDate}
            onChange={date => setForm(f => ({ ...f, startDate: date }))}
          />
        </FormField>

        <FormField
          label="موعد قسط در ماه"
          required
          hint="روز پرداخت هر قسط در ماه (مثلاً ۵ برای پنجم هر ماه)"
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={form.dueDay === '' ? '' : form.dueDay}
            onChange={e =>
              setForm(f => ({
                ...f,
                dueDay: e.target.value === '' ? '' : Number(e.target.value)
              }))
            }
            dir="ltr"
            placeholder="۱ تا ۳۱"
          />
        </FormField>

        {computedEndDate ? (
          <div className="form-group">
            <span className="form-field-label-text">تاریخ پایان قسط</span>
            <div className="form-readonly-value">{formatIsoDatePersian(computedEndDate)}</div>
            <p className="form-hint">
              بر اساس تاریخ شروع، تعداد بازپرداخت و موعد ماهانه محاسبه می‌شود
            </p>
          </div>
        ) : null}

        <FormField
          label="پرداخت‌شده تا تاریخ"
          hint="اقساطی که موعد آن‌ها تا این تاریخ است به‌عنوان پرداخت‌شده ثبت می‌شوند"
        >
          <JalaliDatePicker
            value={form.paidUntil}
            onChange={date => setForm(f => ({ ...f, paidUntil: date }))}
            allowEmpty
            emptyLabel="هنوز پرداختی ثبت نشده"
          />
        </FormField>
        {form.paidUntil ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setForm(f => ({ ...f, paidUntil: '' }))}
          >
            پاک کردن
          </button>
        ) : null}

        <FormField label="توضیحات">
          <textarea
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="توضیحات اختیاری"
          />
        </FormField>
      </FormModal>

      <ConfirmActionModal {...importExportConfirmModal} />

      <ConfirmDeleteModal
        open={deletingPlan !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  )
}
