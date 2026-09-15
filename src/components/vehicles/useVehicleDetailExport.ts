import { useCallback, useMemo } from 'react'

import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import type { VehicleDetailExportPayload } from '../../services/vehicleDetailExport'
import { exportVehicleDetailCsv, exportVehicleDetailPdf } from '../../services/vehicleDetailExport'

export function useVehicleDetailExport(getPayload: () => VehicleDetailExportPayload) {
  const exportFn = useCallback(async () => {
    await exportVehicleDetailCsv(getPayload())
  }, [getPayload])

  const exportPdfFn = useCallback(async () => {
    await exportVehicleDetailPdf(getPayload())
  }, [getPayload])

  const { handleExport, handleExportPdf, importExportConfirmModal } = useSheetImportExport({
    exportFn: async () => exportFn(),
    exportPdfFn: async () => exportPdfFn(),
    importFn: async () => ({ imported: 0, skipped: 0 }),
    onComplete: () => {}
  })

  return useMemo(
    () => ({
      handleExport,
      handleExportPdf,
      importExportConfirmModal
    }),
    [handleExport, handleExportPdf, importExportConfirmModal]
  )
}
