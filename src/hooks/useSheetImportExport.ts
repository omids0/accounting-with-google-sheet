import { useCallback, useRef, useState } from 'react'

import { PartialImportError, type ImportPreview } from '../services/importExport'
import { formatImportSummary } from '../services/importPlan'
import { requireSpreadsheetId } from '../utils/authGuard'
import { pickTextFile } from '../utils/csv'
import { runExport } from '../utils/exportFeedback'
import { showError, showSuccess } from '../utils/toast'
import { toUserMessage } from '../utils/userMessage'

type SheetExportFn = (spreadsheetId: string) => Promise<string | null>

const IMPORT_ERROR = 'خطا در ایمپورت'

function faCount(value: number): string {
  return value.toLocaleString('fa-IR')
}

function importErrorMessage(err: unknown): string {
  if (!(err instanceof PartialImportError)) return toUserMessage(err, IMPORT_ERROR)

  return `${faCount(err.imported)} ردیف افزوده شد؛ ${faCount(
    err.remaining
  )} ردیف باقی‌مانده افزوده نشد. ${toUserMessage(err.failure, IMPORT_ERROR)}`
}

function previewModalContent(preview: ImportPreview | null) {
  if (!preview) {
    return {
      title: 'ورود از CSV',
      message: 'فایل CSV را انتخاب کنید. پیش از افزودن، پیش‌نمایش ردیف‌ها را می‌بینید.',
      confirmLabel: 'انتخاب فایل',
      cancelLabel: 'انصراف'
    }
  }

  return {
    title: 'پیش‌نمایش ایمپورت',
    message: formatImportSummary(preview),
    confirmLabel: preview.rows.length
      ? `ایمپورت ${faCount(preview.rows.length)} ردیف`
      : 'متوجه شدم',
    cancelLabel: 'انصراف'
  }
}

export function useSheetImportExport({
  exportFn,
  exportPdfFn,
  importFn,
  onComplete
}: {
  exportFn: SheetExportFn
  exportPdfFn?: SheetExportFn
  importFn?: (spreadsheetId: string, csvContent: string) => Promise<ImportPreview>
  onComplete?: () => void | Promise<void>
}) {
  const [importOpen, setImportOpen] = useState(false)

  const [preview, setPreview] = useState<ImportPreview | null>(null)

  const [confirming, setConfirming] = useState(false)

  const exportingRef = useRef(false)

  const runSheetExport = useCallback(async (fn: SheetExportFn, fallbackMessage: string) => {
    if (exportingRef.current) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    exportingRef.current = true
    try {
      await runExport(() => fn(spreadsheetId), fallbackMessage)
    } finally {
      exportingRef.current = false
    }
  }, [])

  const handleExport = useCallback(() => {
    void runSheetExport(exportFn, 'خطا در خروجی CSV')
  }, [exportFn, runSheetExport])

  const handleExportPdf = useCallback(() => {
    if (exportPdfFn) void runSheetExport(exportPdfFn, 'خطا در خروجی PDF')
  }, [exportPdfFn, runSheetExport])

  const handleImport = useCallback(() => {
    if (!importFn || !requireSpreadsheetId()) return
    setPreview(null)
    setImportOpen(true)
  }, [importFn])

  const closeImport = useCallback(() => {
    setImportOpen(false)
    setPreview(null)
  }, [])

  const closeConfirm = useCallback(() => {
    if (!confirming) closeImport()
  }, [confirming, closeImport])

  /** Resolves true when a preview is ready and the modal should stay open. */
  const loadPreview = useCallback(
    async (spreadsheetId: string): Promise<boolean> => {
      const content = importFn ? await pickTextFile() : null

      if (!importFn || !content) return false

      setPreview(await importFn(spreadsheetId, content))

      return true
    },
    [importFn]
  )

  const applyPreview = useCallback(
    async (current: ImportPreview) => {
      try {
        const { imported, skipped } = await current.apply()

        const skippedNote = skipped > 0 ? ` (${faCount(skipped)} رد شد)` : ''

        showSuccess(`${faCount(imported)} ردیف وارد شد${skippedNote}`)
        await onComplete?.()
      } catch (err) {
        showError(importErrorMessage(err))
        if (err instanceof PartialImportError && err.imported > 0) await onComplete?.()
      }
    },
    [onComplete]
  )

  const handleConfirm = useCallback(async () => {
    if (preview && !preview.rows.length) {
      closeImport()

      return
    }

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setConfirming(true)

    let keepOpen = false

    try {
      if (preview) await applyPreview(preview)
      else keepOpen = await loadPreview(spreadsheetId)
    } catch (err) {
      showError(toUserMessage(err, IMPORT_ERROR))
    } finally {
      setConfirming(false)
      if (!keepOpen) closeImport()
    }
  }, [preview, closeImport, applyPreview, loadPreview])

  return {
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal: {
      open: importOpen,
      ...previewModalContent(preview),
      confirming,
      onClose: closeConfirm,
      onConfirm: handleConfirm
    }
  }
}
