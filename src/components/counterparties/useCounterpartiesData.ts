import { useCallback, useEffect, useRef, useState } from 'react'

import type { CounterpartyWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { useUndoableDelete } from '../../hooks/useUndoableDelete'
import {
  deleteCounterparty,
  ensureCounterpartiesSheet,
  getCounterpartyFullName,
  fetchCounterparties
} from '../../services/counterparties'
import {
  exportCounterpartiesCsv,
  exportCounterpartiesPdf,
  importCounterpartiesCsv
} from '../../services/counterpartiesSheetIO'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { confirmDelete, undoableDeleteMessage } from '../../utils/confirmDelete'
import { handleSheetError } from '../../utils/sheetError'
import { useReadOnly } from '../ui/readOnly'

export function useCounterpartiesData() {
  const readOnly = useReadOnly()
  const [items, setItems] = useState<CounterpartyWithRow[]>([])
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const dataRevision = useDataRefresh()

  const undoableDelete = useUndoableDelete()
  // Rows shift after every delete; the write looks its row up again by id.
  const itemsRef = useRef(items)

  itemsRef.current = items

  const loadItems = useCallback(async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setLoading(true)
    try {
      await ensureCounterpartiesSheet(spreadsheetId)

      const data = await fetchCounterparties(spreadsheetId)

      setItems(data)
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری طرف حساب‌ها' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isConfigured()) return

    void loadItems()
  }, [loadItems, dataRevision])

  const requestDelete = async (item: CounterpartyWithRow) => {
    if (readOnly) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const fullName = getCounterpartyFullName(item)
    const label = fullName ? `طرف حساب «${fullName}»` : 'طرف حساب'

    if (!(await confirmDelete({ label, message: undoableDeleteMessage(label) }))) return

    void undoableDelete.schedule({
      id: item.id,
      label,
      errorMessage: 'حذف ناموفق بود',
      commit: async () => {
        const current = itemsRef.current.find(entry => entry.id === item.id) ?? item

        await deleteCounterparty(spreadsheetId, current.rowNumber)
        await loadItems()
      }
    })
  }

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportCounterpartiesCsv,
      exportPdfFn: exportCounterpartiesPdf,
      importFn: importCounterpartiesCsv,
      onComplete: loadItems
    })

  return {
    /** The list minus the row waiting in the undo window. */
    items: undoableDelete.visible(items),
    loading,
    loadItems,
    requestDelete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal
  }
}
