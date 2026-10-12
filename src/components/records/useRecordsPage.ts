import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  enrichRecord,
  getCategoryOptions,
  getFormField,
  sortRecords,
  type StoredRecord
} from './recordsUtils'
import { useRecordsDelete } from './useRecordsDelete'
import { useRecordsFilters } from './useRecordsFilters'
import { useRecordsFormActions } from './useRecordsFormActions'
import { syncCategoriesFromSheet } from '../../services/categories'
import { getSettings, isConfigured } from '../../services/settings'
import { fetchRecords } from '../../services/sheets'
import type { CustomForm } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { isDateInRange } from '../../utils/dateRange'
import { handleSheetError } from '../../utils/sheetError'

/** `focusRecordId`: show only that record (the entry form's duplicate warning links here). */
export function useRecordsPage(initialFormType?: 'income' | 'expense', focusRecordId?: string) {
  const [focusId, setFocusId] = useState(focusRecordId ?? '')
  const [forms, setForms] = useState<CustomForm[]>([])
  const [activeFormId, setActiveFormId] = useState('')
  const [rawRecords, setRecords] = useState<StoredRecord[]>([])
  const [loading, setLoading] = useState(false)

  const activeForm = activeFormId === 'all' ? undefined : forms.find(f => f.id === activeFormId)
  const isAllForms = activeFormId === 'all'

  const loadRecords = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return

    if (!requireAuth()) return

    setLoading(true)
    try {
      await syncCategoriesFromSheet(settings.spreadsheetId)
      const refreshedSettings = getSettings() ?? settings

      setForms(refreshedSettings.forms)

      const formsToLoad =
        activeFormId === 'all'
          ? refreshedSettings.forms
          : refreshedSettings.forms.filter(f => f.id === activeFormId)

      if (!formsToLoad.length) return

      const batches = await Promise.all(
        formsToLoad.map(async form => {
          const data = await fetchRecords(settings.spreadsheetId, form)

          return data.map(record => enrichRecord(record, form))
        })
      )

      setRecords(sortRecords(batches.flat(), refreshedSettings.forms))
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری' })) return
    } finally {
      setLoading(false)
    }
  }, [activeFormId])

  const formActions = useRecordsFormActions({ forms, loadRecords })
  const { requestDelete, flushPendingDelete, visibleRecords } = useRecordsDelete({
    forms,
    records: rawRecords,
    loadRecords
  })

  // Everything below (filters, totals, counts) sees the list without the row in its undo window.
  const records = visibleRecords

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
        if (!getFormField(form, 'category')) continue

        const formRecords = records.filter(record => record.formId === form.id)

        getCategoryOptions(form, formRecords).forEach(cat => categories.add(cat))
      }

      return [...categories]
    }

    return getCategoryOptions(activeForm, records)
  }, [isAllForms, forms, activeForm, records])

  const filters = useRecordsFilters({
    records,
    activeForm,
    showCategoryFilter: Boolean(showCategoryFilter),
    onFormsRefresh: setForms
  })

  const { categoryFilter, dateRange, datePreset, subcategory, setCategoryFilter } = filters

  const { matches: matchesSubcategory, subCategoryFilter } = subcategory

  useEffect(() => setFocusId(focusRecordId ?? ''), [focusRecordId])

  const filteredRecords = useMemo(() => {
    if (focusId) return records.filter(record => record.id === focusId)

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
      if (!matchesSubcategory(record)) return false

      return true
    })
  }, [records, dateRange, categoryFilter, forms, matchesSubcategory, focusId])

  const showFilteredSummary = useMemo(
    () =>
      categoryFilter !== 'all' ||
      subCategoryFilter !== 'all' ||
      datePreset !== 'month-to-date' ||
      filteredRecords.length !== records.length,
    [categoryFilter, datePreset, filteredRecords.length, records.length, subCategoryFilter]
  )

  const handleFormChange = (formId: string) => {
    void flushPendingDelete()
    setActiveFormId(formId)
    setCategoryFilter('all')
  }

  return {
    forms,
    activeForm,
    activeFormId,
    records,
    loading,
    isAllForms,
    loadRecords,
    showCategoryFilter,
    categoryOptions,
    filteredRecords,
    showFilteredSummary,
    handleFormChange,
    ...filters,
    filterChips: focusId
      ? [
          { id: 'record', label: 'فقط یک رکورد', onRemove: () => setFocusId('') },
          ...filters.filterChips
        ]
      : filters.filterChips,
    clearAllFilters: () => {
      setFocusId('')
      filters.clearAllFilters()
    },
    requestDelete,
    ...formActions
  }
}
