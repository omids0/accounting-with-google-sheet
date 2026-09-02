import type { PageSpeedDialAction } from './usePageSpeedDial'
import SpeedDialIcon from '../components/SpeedDialIcon'

export function createPageSpeedDialActions({
  onAdd,
  onFilter,
  onRefresh,
  refreshDisabled,
  onImport,
  onExport,
  onExportPdf
}: {
  onAdd: () => void
  onFilter?: () => void
  onRefresh: () => void
  refreshDisabled?: boolean
  onImport?: () => void
  onExport?: () => void
  onExportPdf?: () => void
}): PageSpeedDialAction[] {
  return [
    {
      id: 'add',
      label: 'افزودن',
      icon: <SpeedDialIcon name="add" />,
      onClick: onAdd
    },
    {
      id: 'filter',
      label: 'فیلتر',
      icon: <SpeedDialIcon name="filter" />,
      onClick: onFilter ?? (() => undefined),
      disabled: !onFilter
    },
    {
      id: 'refresh',
      label: 'بروزرسانی',
      icon: <SpeedDialIcon name="refresh" />,
      onClick: onRefresh,
      disabled: refreshDisabled
    },
    {
      id: 'export',
      label: 'اکسپورت',
      icon: <SpeedDialIcon name="export" />,
      onClick: onExport ?? (() => undefined),
      disabled: !onExport
    },
    {
      id: 'export-pdf',
      label: 'خروجی PDF',
      icon: <SpeedDialIcon name="pdf" />,
      onClick: onExportPdf ?? (() => undefined),
      disabled: !onExportPdf
    },
    {
      id: 'import',
      label: 'ایمپورت',
      icon: <SpeedDialIcon name="import" />,
      onClick: onImport ?? (() => undefined),
      disabled: !onImport
    }
  ]
}
