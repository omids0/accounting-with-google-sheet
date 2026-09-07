import { useEffect, useState } from 'react'

import { usePwaInstall } from '../../hooks/usePwaInstall'
import { isTokenValid, logout } from '../../services/auth'
import { syncCategoriesFromSheet } from '../../services/categories'
import { getSettings, getSpreadsheets, updateCurrency } from '../../services/settings'
import { formatSpreadsheetTitle, getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import {
  createNamedSpreadsheet,
  switchActiveSpreadsheet,
  syncSpreadsheetsFromDrive
} from '../../services/spreadsheetSetup'
import { bumpSpreadsheetKey, requestLogout } from '../../stores/appStore'
import type { CurrencyUnit, SpreadsheetEntry } from '../../types'
import { showError, showSuccess } from '../../utils/toast'

export function useSettingsPage() {
  const [spreadsheetId, setSpreadsheetId] = useState('')

  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetEntry[]>([])

  const [newSheetName, setNewSheetName] = useState('')

  const [showNewSheetForm, setShowNewSheetForm] = useState(false)

  const [currency, setCurrency] = useState<CurrencyUnit>('toman')

  const [loading, setLoading] = useState(false)

  const [initialLoading, setInitialLoading] = useState(() => isTokenValid())

  const { canInstall, isInstalled, showIosHint, isIos, install, dismissIosHint } = usePwaInstall()

  useEffect(() => {
    const settings = getSettings()

    setSpreadsheetId(settings?.spreadsheetId ?? '')
    setSpreadsheets(getSpreadsheets())
    setCurrency(settings?.currency ?? 'toman')

    if (!isTokenValid()) {
      setInitialLoading(false)

      return
    }

    const loadSheetData = async () => {
      try {
        if (settings?.spreadsheetId) {
          await syncCategoriesFromSheet(settings.spreadsheetId)
        }

        const merged = await syncSpreadsheetsFromDrive()

        setSpreadsheets(merged)
        setSpreadsheetId(getSettings()?.spreadsheetId ?? settings?.spreadsheetId ?? '')
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
      requestLogout()
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
      bumpSpreadsheetKey()
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

      const selected = getSpreadsheets().find(sheet => sheet.id === nextId)

      showSuccess(`شیت فعال: ${selected ? getSpreadsheetLabel(selected.name) : 'انتخاب‌شده'}`)
      bumpSpreadsheetKey()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در تغییر شیت')
    } finally {
      setLoading(false)
    }
  }

  const handleCurrencyChange = (value: CurrencyUnit) => {
    setCurrency(value)
    updateCurrency(value)
    showSuccess('واحد پول ذخیره شد')
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
    currency,
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
    handleCurrencyChange,
    cancelNewSheetForm
  }
}
