import { useEffect, useState } from 'react'

import type { SettingsPageProps } from './types'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { isTokenValid, logout } from '../../services/auth'
import { saveFormCategoriesToSheet, syncCategoriesFromSheet } from '../../services/categories'
import {
  getSettings,
  saveSettings,
  getDefaultSettings,
  getSpreadsheets,
  updateCurrency,
  updateTheme as persistTheme
} from '../../services/settings'
import { formatSpreadsheetTitle, getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import {
  createNamedSpreadsheet,
  switchActiveSpreadsheet,
  syncSpreadsheetsFromDrive
} from '../../services/spreadsheetSetup'
import type { CurrencyUnit, FieldConfig, SpreadsheetEntry, ThemeMode } from '../../types'
import { applyTheme } from '../../utils/theme'
import { showError, showSuccess } from '../../utils/toast'

export function useSettingsPage({ onLogout, onSpreadsheetChange }: SettingsPageProps) {
  const [spreadsheetId, setSpreadsheetId] = useState('')

  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetEntry[]>([])

  const [newSheetName, setNewSheetName] = useState('')

  const [showNewSheetForm, setShowNewSheetForm] = useState(false)

  const [forms, setForms] = useState(getDefaultSettings().forms)

  const [currency, setCurrency] = useState<CurrencyUnit>('toman')

  const [theme, setTheme] = useState<ThemeMode>('light')

  const [editingFormId, setEditingFormId] = useState<string | null>(null)

  const [categoriesKey, setCategoriesKey] = useState(0)

  const [loading, setLoading] = useState(false)

  const [initialLoading, setInitialLoading] = useState(() => isTokenValid())

  const { canInstall, isInstalled, showIosHint, isIos, install, dismissIosHint } = usePwaInstall()

  useEffect(() => {
    const settings = getSettings() ?? getDefaultSettings()

    setSpreadsheetId(settings.spreadsheetId)
    setSpreadsheets(getSpreadsheets())
    setForms(settings.forms)
    setCurrency(settings.currency ?? 'toman')
    setTheme(settings.theme ?? 'light')

    if (!isTokenValid()) {
      setInitialLoading(false)

      return
    }

    const loadSheetData = async () => {
      try {
        if (settings.spreadsheetId) {
          await syncCategoriesFromSheet(settings.spreadsheetId)

          const refreshed = getSettings() ?? getDefaultSettings()

          setForms(refreshed.forms)
          setCategoriesKey(key => key + 1)
        }

        const merged = await syncSpreadsheetsFromDrive()

        setSpreadsheets(merged)
        setSpreadsheetId(getSettings()?.spreadsheetId ?? settings.spreadsheetId)
      } catch {
        // Keep local list if Drive sync fails (e.g. old token scope).
      } finally {
        setInitialLoading(false)
      }
    }

    loadSheetData()
  }, [])

  const handleLogout = () => {
    if (confirm('از حساب خارج می‌شوید؟')) {
      logout()
      onLogout?.()
    }
  }

  const handleRefreshSpreadsheets = async () => {
    if (!isTokenValid()) {
      showError('نشست منقضی شده — دوباره وارد شوید')

      return
    }

    setLoading(true)
    try {
      const merged = await syncSpreadsheetsFromDrive()

      setSpreadsheets(merged)
      setSpreadsheetId(getSettings()?.spreadsheetId ?? '')
      showSuccess('لیست شیت‌ها از Google Drive بروز شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در دریافت لیست از Drive')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSpreadsheet = async () => {
    if (!newSheetName.trim()) {
      showError('نام شیت را وارد کنید')

      return
    }
    if (!isTokenValid()) {
      showError('نشست منقضی شده')

      return
    }

    setLoading(true)

    const trimmedName = newSheetName.trim()

    try {
      const newId = await createNamedSpreadsheet(trimmedName)

      setSpreadsheetId(newId)
      setSpreadsheets(getSpreadsheets())
      setNewSheetName('')
      setShowNewSheetForm(false)
      showSuccess(`شیت «${formatSpreadsheetTitle(trimmedName)}» ساخته و فعال شد`)
      onSpreadsheetChange?.()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در ساخت شیت')
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchSpreadsheet = async (nextId: string) => {
    if (!nextId || nextId === spreadsheetId) return
    if (!isTokenValid()) {
      showError('نشست منقضی شده')

      return
    }

    setLoading(true)
    try {
      await switchActiveSpreadsheet(nextId)
      setSpreadsheetId(nextId)
      setSpreadsheets(getSpreadsheets())
      await syncCategoriesFromSheet(nextId)

      const refreshed = getSettings() ?? getDefaultSettings()

      setForms(refreshed.forms)
      setCategoriesKey(key => key + 1)

      const selected = getSpreadsheets().find(sheet => sheet.id === nextId)

      showSuccess(`شیت فعال: ${selected ? getSpreadsheetLabel(selected.name) : 'انتخاب‌شده'}`)
      onSpreadsheetChange?.()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در تغییر شیت')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCategories = async (formId: string, categoriesText: string) => {
    const categories = categoriesText
      .split(/[,،]/)
      .map(s => s.trim())
      .filter(Boolean)

    if (!categories.length) return

    const settings = getSettings() ?? getDefaultSettings()

    if (!settings.spreadsheetId) {
      showError('ابتدا شیت فعال را انتخاب کنید')

      return
    }
    if (!isTokenValid()) {
      showError('نشست منقضی شده')

      return
    }

    setLoading(true)
    try {
      await saveFormCategoriesToSheet(settings.spreadsheetId, formId, categories)

      const refreshed = getSettings() ?? getDefaultSettings()

      setForms(refreshed.forms)
      setCategoriesKey(key => key + 1)
      showSuccess('دسته‌بندی‌ها در گوگل شیت ذخیره شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در ذخیره دسته‌بندی‌ها')
    } finally {
      setLoading(false)
    }
  }

  const handleCurrencyChange = (value: CurrencyUnit) => {
    setCurrency(value)
    updateCurrency(value)
    showSuccess('واحد پول ذخیره شد')
  }

  const handleThemeChange = (value: ThemeMode) => {
    setTheme(value)
    persistTheme(value)
    applyTheme(value)
    showSuccess('حالت نمایش ذخیره شد')
  }

  const handleSaveFormFields = (formId: string, fields: FieldConfig[]) => {
    const settings = getSettings() ?? getDefaultSettings()

    const updatedForms = settings.forms.map(f => (f.id === formId ? { ...f, fields } : f))

    saveSettings({ ...settings, forms: updatedForms })
    setForms(updatedForms)
    setEditingFormId(null)
    showSuccess('فیلدها ذخیره شد')
  }

  const cancelNewSheetForm = () => {
    setShowNewSheetForm(false)
    setNewSheetName('')
  }

  return {
    spreadsheetId,
    spreadsheets,
    newSheetName,
    setNewSheetName,
    showNewSheetForm,
    setShowNewSheetForm,
    forms,
    currency,
    theme,
    editingFormId,
    setEditingFormId,
    categoriesKey,
    loading,
    initialLoading,
    canInstall,
    isInstalled,
    showIosHint,
    isIos,
    install,
    dismissIosHint,
    handleLogout,
    handleRefreshSpreadsheets,
    handleCreateSpreadsheet,
    handleSwitchSpreadsheet,
    handleSaveCategories,
    handleCurrencyChange,
    handleThemeChange,
    handleSaveFormFields,
    cancelNewSheetForm
  }
}
