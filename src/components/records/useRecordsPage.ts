import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  enrichRecord,
  getCategoryOptions,
  getFormField,
  sortRecords,
  type StoredRecord
} from './recordsUtils'
import { useRecordsFormActions } from './useRecordsFormActions'
import { getSettings, isConfigured } from '../../services/settings'
import { fetchRecords } from '../../services/sheets'
import type { CustomForm } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import {
  formatDateRangeLabel,
  isDateInRange,
  resolveDateRange,
  type RecordsDatePreset
} from '../../utils/dateRange'
import { buildCategoryChip, buildDateRangeChip, compactFilterChips } from '../../utils/filterChips'
import { handleSheetError } from '../../utils/sheetError'
import { createDefaultDateRangeFilter, type AppliedDateRangeFilter } from '../DateRangeFilter'

export function useRecordsPage(initialFormType?: 'income' | 'expense') {
  const [forms, setForms] = useState<CustomForm[]>([])
  const [activeFormId, setActiveFormId] = useState('')
  const [records, setRecords] = useState<StoredRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [datePreset, setDatePreset] = useState<RecordsDatePreset>('month-to-date')
  const [customRange, setCustomRange] = useState(() => createDefaultDateRangeFilter().customRange)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [draftDatePreset, setDraftDatePreset] = useState<RecordsDatePreset>('month-to-date')
  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  )
  const [draftCategory, setDraftCategory] = useState('all')

  const activeForm = activeFormId === 'all' ? undefined : forms.find(f => f.id === activeFormId)
  const dateRange = resolveDateRange(datePreset, customRange)
  const isAllForms = activeFormId === 'all'

  const loadRecords = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return

    if (!requireAuth()) return

    const formsToLoad =
      activeFormId === 'all' ? settings.forms : settings.forms.filter(f => f.id === activeFormId)

    if (!formsToLoad.length) return

    setLoading(true)
    try {
      const batches = await Promise.all(
        formsToLoad.map(async form => {
          const data = await fetchRecords(settings.spreadsheetId, form)

          return data.map(record => enrichRecord(record, form))
        })
      )

      setRecords(sortRecords(batches.flat(), settings.forms))
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری' })) return
    } finally {
      setLoading(false)
    }
  }, [activeFormId])

  const formActions = useRecordsFormActions({ forms, loadRecords })

  useEffect(() => {
    const settings = getSettings()

    if (!settings) return
    setForms(settings.forms)
    if (initialFormType) {
      const form = settings.forms.find(f => f.type === initialFormType)

      if (form) {
        setActiveFormId(form.id)

        return
      }
    }
    if (settings.forms.length > 1) {
      setActiveFormId('all')

      return
    }
    if (settings.forms.length) setActiveFormId(settings.forms[0].id)
  }, [initialFormType])

  useEffect(() => {
    if (activeFormId && isConfigured()) loadRecords()
  }, [activeFormId, loadRecords])

  const showCategoryFilter = isAllForms
    ? forms.some(form => getFormField(form, 'category'))
    : !!activeForm && getFormField(activeForm, 'category')

  const categoryOptions = useMemo(() => {
    if (isAllForms) {
      const categories = new Set<string>()

      for (const form of forms) {
        const formRecords = records.filter(record => record.formId === form.id)

        getCategoryOptions(form, formRecords).forEach(cat => categories.add(cat))
      }

      return [...categories]
    }

    return getCategoryOptions(activeForm, records)
  }, [isAllForms, forms, activeForm, records])

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const form = forms.find(f => f.id === record.formId)

      if (!form) return false

      const recordDateField = getFormField(form, 'date')
      const recordCategoryField = getFormField(form, 'category')
      const dateFieldId = recordDateField?.id ?? 'date'
      const categoryFieldId = recordCategoryField?.id ?? 'category'
      const date = record.values[dateFieldId] ?? ''

      if (!isDateInRange(date, dateRange)) return false
      if (categoryFilter !== 'all') {
        const category = record.values[categoryFieldId] ?? ''

        if (category !== categoryFilter) return false
      }

      return true
    })
  }, [records, dateRange, categoryFilter, forms])

  const resetDateFilter = useCallback(() => {
    const defaults = createDefaultDateRangeFilter()

    setDatePreset('month-to-date')
    setCustomRange(defaults.customRange)
  }, [])

  const filterChips = useMemo(
    () =>
      compactFilterChips([
        buildDateRangeChip(
          formatDateRangeLabel(dateRange),
          datePreset !== 'month-to-date' ? resetDateFilter : undefined
        ),
        showCategoryFilter &&
          categoryFilter !== 'all' &&
          buildCategoryChip(categoryFilter, () => setCategoryFilter('all'))
      ]),
    [categoryFilter, datePreset, dateRange, resetDateFilter, showCategoryFilter]
  )

  const openFilterModal = useCallback(() => {
    setDraftDatePreset(datePreset)
    setDraftCustomRange(customRange)
    setDraftCategory(categoryFilter)
    setFilterModalOpen(true)
  }, [categoryFilter, customRange, datePreset])

  const handleDraftDateFilterChange = (filter: AppliedDateRangeFilter) => {
    if (filter.preset === 'all') return
    setDraftDatePreset(filter.preset)
    setDraftCustomRange(filter.customRange)
  }

  const clearDraftFilters = useCallback(() => {
    const defaults = createDefaultDateRangeFilter()

    setDraftDatePreset('month-to-date')
    setDraftCustomRange(defaults.customRange)
    setDraftCategory('all')
  }, [])

  const applyFilters = useCallback(() => {
    setDatePreset(draftDatePreset)
    setCustomRange(draftCustomRange)
    setCategoryFilter(draftCategory)
    setFilterModalOpen(false)
  }, [draftCategory, draftCustomRange, draftDatePreset])

  const clearAllFilters = useCallback(() => {
    resetDateFilter()
    setCategoryFilter('all')
  }, [resetDateFilter])

  const handleFormChange = (formId: string) => {
    setActiveFormId(formId)
    setCategoryFilter('all')
  }

  return {
    forms,
    activeForm,
    activeFormId,
    records,
    loading,
    datePreset,
    customRange,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    isAllForms,
    loadRecords,
    showCategoryFilter,
    categoryOptions,
    filteredRecords,
    handleFormChange,
    filterModalOpen,
    setFilterModalOpen,
    draftDatePreset,
    draftCustomRange,
    draftCategory,
    setDraftCategory,
    filterChips,
    openFilterModal,
    handleDraftDateFilterChange,
    clearDraftFilters,
    applyFilters,
    clearAllFilters,
    ...formActions
  }
}
