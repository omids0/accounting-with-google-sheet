import { useMemo } from 'react'

import SpeedDialIcon from '../SpeedDialIcon'
import { useVehicleDetailExport } from './useVehicleDetailExport'
import { useRegisterPageSpeedDial, type PageSpeedDialConfig } from '../../hooks/usePageSpeedDial'
import { isConfigured } from '../../services/settings'
import type { VehicleDetailExportPayload } from '../../services/vehicleDetailExport'

type UseVehicleDetailSpeedDialOptions = {
  active: boolean
  pageSpeedDialConfig: PageSpeedDialConfig
  openFilterModal: () => void
  getExportPayload: () => VehicleDetailExportPayload
}

export function useVehicleDetailSpeedDial({
  active,
  pageSpeedDialConfig,
  openFilterModal,
  getExportPayload
}: UseVehicleDetailSpeedDialOptions) {
  const exportActions = useVehicleDetailExport(getExportPayload)

  const speedDialConfig = useMemo(() => {
    if (!isConfigured()) return null

    const actionById = Object.fromEntries(
      pageSpeedDialConfig.actions.map(action => [action.id, action])
    ) as Record<string, (typeof pageSpeedDialConfig.actions)[number]>

    return {
      ariaLabel: pageSpeedDialConfig.ariaLabel,
      actions: [
        {
          id: 'filter',
          label: 'فیلتر',
          icon: <SpeedDialIcon name="filter" />,
          onClick: openFilterModal
        },
        actionById.mileage,
        actionById.periodic,
        actionById.mechanic,
        actionById.deadline,
        {
          id: 'export-pdf',
          label: 'خروجی PDF',
          icon: <SpeedDialIcon name="pdf" />,
          onClick: exportActions.handleExportPdf
        },
        {
          id: 'export',
          label: 'اکسپورت',
          icon: <SpeedDialIcon name="export" />,
          onClick: exportActions.handleExport
        },
        actionById.refresh
      ].filter(Boolean)
    }
  }, [
    exportActions.handleExport,
    exportActions.handleExportPdf,
    openFilterModal,
    pageSpeedDialConfig
  ])

  useRegisterPageSpeedDial(speedDialConfig, active)

  return exportActions.importExportConfirmModal
}
