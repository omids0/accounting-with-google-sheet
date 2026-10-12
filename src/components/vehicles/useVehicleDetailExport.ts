import { useCallback, useMemo } from 'react'

import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import type { VehicleDetailExportPayload } from '../../services/vehicleDetailExport'
import { exportVehicleDetailCsv, exportVehicleDetailPdf } from '../../services/vehicleDetailExport'

export function useVehicleDetailExport(getPayload: () => VehicleDetailExportPayload) {
  const exportFn = useCallback(() => exportVehicleDetailCsv(getPayload()), [getPayload])

  const exportPdfFn = useCallback(() => exportVehicleDetailPdf(getPayload()), [getPayload])

  const { handleExport, handleExportPdf, importExportConfirmModal } = useSheetImportExport({
    exportFn,
    exportPdfFn
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
