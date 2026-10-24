import { useCallback, useMemo, useState } from 'react'

import BuildingExpenseHero from './BuildingExpenseHero'
import BuildingListFilters from './BuildingListFilters'
import {
  ALL_CATEGORIES,
  expenseChips,
  expenseMonths,
  expensesOfMonth,
  filterExpenses,
  nonFlowOfMonth,
  sumAmounts,
  type ExpenseChip
} from './expenseRows'
import FilterChipBar from './FilterChipBar'
import NonFlowRecords from './NonFlowRecords'
import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { useListFilters } from '../../hooks/useListFilters'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { isNonFlowCategory } from '../../services/buildingDashboard'
import { expenseBreakdown } from '../../services/buildingExpenseMeta'
import { getManagedList } from '../../services/buildingLists'
import { monthKeyOfIso, monthLabel, monthName } from '../../services/buildingMonths'
import { isConfigured } from '../../services/settings'
import { useNavigationStore } from '../../stores/navigationStore'
import { getTodayIso } from '../../utils/jalaliDate'
import EmptyState from '../EmptyState'
import { Select } from '../form'
import RecordsList from '../records/RecordsList'
import RecordsPageOverlays from '../records/RecordsPageOverlays'
import { getFormField, type StoredRecord } from '../records/recordsUtils'
import { useRecordDetail } from '../records/useRecordDetail'
import { useRecordsPage } from '../records/useRecordsPage'
import SearchEmptyState from '../SearchEmptyState'
import { RecordListSkeleton } from '../skeleton'
import { listModulePageClass } from '../ui/featureCardStyles'

const searchParts = (record: StoredRecord) => [
  record.values.title,
  record.values.category,
  record.values.subCategory,
  record.values.counterparty,
  record.values.note
]

/**
 * «هزینه‌ها» of a building: the month's expense records (the app's own records list, with the
 * kind, payer and split on each row), a hero with the month total and its split by kind and
 * payer, and chips for kind, who paid and category. A tap opens the record detail with the unit
 * shares; the speed dial records a new expense in the full entry form.
 */
export default function BuildingExpensesPage({ active = true }: { active?: boolean }) {
  // Both forms: a correction can be an income, and it must stay editable here.
  const page = useRecordsPage()
  const detail = useRecordDetail(page.records)
  const { can } = useBuildingAccess()
  const canRecord = can('record')

  const currentMonth = monthKeyOfIso(getTodayIso())

  const [month, setMonth] = useState(currentMonth)
  const [chip, setChip] = useState<ExpenseChip>('all')
  const [category, setCategory] = useState(ALL_CATEGORIES)
  /** null = the default: open when the month has no expense at all, closed otherwise. */
  const [nonFlowOpen, setNonFlowOpen] = useState<boolean | null>(null)

  const form = page.forms.find(item => item.type === 'expense')

  const dateFieldId = (form && getFormField(form, 'date')?.id) || 'date'

  const dateFieldOf = useCallback(
    (formId: string) => {
      const own = page.forms.find(item => item.id === formId)

      return (own && getFormField(own, 'date')?.id) || 'date'
    },
    [page.forms]
  )

  const expenseRecords = useMemo(
    () => page.records.filter(record => record.formId === form?.id),
    [page.records, form?.id]
  )

  const kinds = getManagedList('EXPENSE_KINDS')

  const payers = getManagedList('EXPENSE_PAYERS')

  const months = useMemo(
    () =>
      // Expense months, plus the months that only have a transfer or correction (either form).
      expenseMonths(
        page.records.filter(
          record => record.formId === form?.id || isNonFlowCategory(record.values.category)
        ),
        dateFieldId,
        currentMonth
      ),
    [page.records, form?.id, dateFieldId, currentMonth]
  )

  const ofMonth = useMemo(
    () => expensesOfMonth(expenseRecords, dateFieldId, month),
    [expenseRecords, dateFieldId, month]
  )

  const breakdown = useMemo(
    () => expenseBreakdown(ofMonth, kinds, payers),
    [ofMonth, kinds, payers]
  )

  const nonFlow = useMemo(
    () => nonFlowOfMonth(page.records, dateFieldOf, month),
    [page.records, dateFieldOf, month]
  )

  const categories = useMemo(
    () => [...new Set(ofMonth.map(record => record.values.category).filter(Boolean))],
    [ofMonth]
  )

  const rows = useMemo(
    () => filterExpenses(expenseRecords, { month, chip, category }, dateFieldId),
    [expenseRecords, month, chip, category, dateFieldId]
  )

  const filters = useListFilters({ items: rows, getSearchParts: searchParts })

  const speedDial = useMemo(
    () => ({
      ariaLabel: 'عملیات هزینه‌ها',
      actions: createPageSpeedDialActions({
        onAdd: () => useNavigationStore.getState().onOpenEntry('expense'),
        addLabel: 'هزینه',
        onFilter: filters.openFilterModal,
        onRefresh: () => void page.loadRecords(),
        refreshDisabled: page.loading
      }).filter(action => !action.disabled && (canRecord || action.id !== 'add'))
    }),
    [canRecord, filters.openFilterModal, page]
  )

  useRegisterPageSpeedDial(isConfigured() ? speedDial : null, active)

  if (!isConfigured()) return <EmptyState icon="records" message="ابتدا با گوگل وارد شوید" />

  if (page.loading && !page.records.length) return <RecordListSkeleton />

  const shown = filters.filteredItems

  const nonFlowShown = nonFlowOpen ?? !ofMonth.length

  return (
    <div className={listModulePageClass}>
      <BuildingListFilters filters={filters} placeholder="جستجوی عنوان، دسته یا طرف حساب..." />
      <BuildingExpenseHero
        monthName={monthName(month)}
        breakdown={breakdown}
        excluded={sumAmounts(nonFlow)}
        open={nonFlowShown}
        onToggle={() => setNonFlowOpen(!nonFlowShown)}
        panelId="building-non-flow"
      />

      <Select
        aria-label="ماه"
        value={month}
        onChange={next => {
          setMonth(next)
          setCategory(ALL_CATEGORIES)
          setNonFlowOpen(null)
        }}
        options={months.map(key => ({ value: key, label: monthLabel(key) }))}
      />
      <FilterChipBar
        ariaLabel="نوع هزینه"
        value={chip}
        onChange={setChip}
        options={expenseChips(kinds)}
      />
      {categories.length > 1 ? (
        <Select
          aria-label="دسته"
          value={category}
          onChange={setCategory}
          options={[
            { value: ALL_CATEGORIES, label: 'همهٔ دسته‌ها' },
            ...categories.map(name => ({ value: name, label: name }))
          ]}
        />
      ) : null}

      {!ofMonth.length && !nonFlow.length ? (
        <EmptyState
          icon="empty-inbox"
          message="هزینه‌ای در این ماه نیست"
          description="با دکمهٔ شناور اولین هزینه را ثبت کن."
          action={
            canRecord
              ? {
                  label: 'ثبت هزینه',
                  onClick: () => useNavigationStore.getState().onOpenEntry('expense')
                }
              : undefined
          }
        />
      ) : !ofMonth.length ? null : shown.length ? (
        <RecordsList
          forms={page.forms}
          activeForm={page.activeForm}
          isAllForms={false}
          filteredRecords={shown}
          readOnly={!canRecord}
          onEdit={page.openEditForm}
          onDelete={page.requestDelete}
          onOpen={detail.open}
        />
      ) : (
        <SearchEmptyState />
      )}

      <NonFlowRecords
        id="building-non-flow"
        open={nonFlowShown}
        records={nonFlow}
        forms={page.forms}
        readOnly={!canRecord}
        onEdit={page.openEditForm}
        onDelete={page.requestDelete}
        onOpen={detail.open}
      />

      <RecordsPageOverlays page={page} detail={detail} readOnly={!canRecord} />
    </div>
  )
}
