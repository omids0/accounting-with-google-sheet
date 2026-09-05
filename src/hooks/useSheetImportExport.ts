import { useCallback, useState } from 'react'

import type { ImportResult } from '../services/importExport'
import { requireSpreadsheetId } from '../utils/authGuard'
import { pickTextFile } from '../utils/csv'
import { showError, showSuccess } from '../utils/toast'

type PendingAction = 'export' | 'exportPdf' | 'import'

const ACTION_MODAL_CONTENT: Record<PendingAction, { title: string; message: string }> = {
  export: {
    title: 'تأیید اکسپورت',
    message: 'آیا از گرفتن خروجی اکسل اطمینان دارید؟'
  },
  exportPdf: {
    title: 'تأیید خروجی PDF',
    message: 'آیا از گرفتن خروجی PDF اطمینان دارید؟'
  },
  import: {
    title: 'تأیید ایمپورت',
    message: 'آیا از وارد کردن داده از فایل اطمینان دارید؟'
  }
}

export function useSheetImportExport({
  exportFn,
  exportPdfFn,
  importFn,
  onComplete
}: {
  exportFn: (spreadsheetId: string) => Promise<void>
  exportPdfFn?: (spreadsheetId: string) => Promise<void>
  importFn: (spreadsheetId: string, csvContent: string) => Promise<ImportResult>
  onComplete: () => void | Promise<void>
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const [confirming, setConfirming] = useState(false)

  const ensureAuth = useCallback(() => requireSpreadsheetId(), [])

  const executeExport = useCallback(async () => {
    const spreadsheetId = ensureAuth()

    if (!spreadsheetId) return

    try {
      await exportFn(spreadsheetId)
      showSuccess('فایل اکسپورت شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در اکسپورت')
    }
  }, [exportFn, ensureAuth])

  const executeExportPdf = useCallback(async () => {
    if (!exportPdfFn) return

    const spreadsheetId = ensureAuth()

    if (!spreadsheetId) return

    try {
      await exportPdfFn(spreadsheetId)
      showSuccess('فایل PDF ذخیره شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در خروجی PDF')
    }
  }, [exportPdfFn, ensureAuth])

  const executeImport = useCallback(async () => {
    const spreadsheetId = ensureAuth()

    if (!spreadsheetId) return

    try {
      const content = await pickTextFile()

      if (!content) return

      const result = await importFn(spreadsheetId, content)

      const skipped = result.skipped > 0 ? ` (${result.skipped.toLocaleString('fa-IR')} رد شد)` : ''

      showSuccess(`${result.imported.toLocaleString('fa-IR')} مورد وارد شد${skipped}`)
      await onComplete()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در ایمپورت')
    }
  }, [importFn, onComplete, ensureAuth])

  const handleExport = useCallback(() => {
    if (!ensureAuth()) return
    setPendingAction('export')
  }, [ensureAuth])

  const handleExportPdf = useCallback(() => {
    if (!exportPdfFn) return
    if (!ensureAuth()) return
    setPendingAction('exportPdf')
  }, [exportPdfFn, ensureAuth])

  const handleImport = useCallback(() => {
    if (!ensureAuth()) return
    setPendingAction('import')
  }, [ensureAuth])

  const closeConfirm = useCallback(() => {
    if (!confirming) setPendingAction(null)
  }, [confirming])

  const handleConfirm = useCallback(async () => {
    if (!pendingAction) return

    setConfirming(true)
    try {
      if (pendingAction === 'export') await executeExport()
      else if (pendingAction === 'exportPdf') await executeExportPdf()
      else if (pendingAction === 'import') await executeImport()
      setPendingAction(null)
    } finally {
      setConfirming(false)
    }
  }, [pendingAction, executeExport, executeExportPdf, executeImport])

  const modalContent = pendingAction ? ACTION_MODAL_CONTENT[pendingAction] : null

  return {
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal: {
      open: pendingAction !== null,
      title: modalContent?.title ?? '',
      message: modalContent?.message ?? '',
      confirming,
      onClose: closeConfirm,
      onConfirm: handleConfirm
    }
  }
}
