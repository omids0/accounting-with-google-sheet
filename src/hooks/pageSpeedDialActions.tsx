import type { PageSpeedDialAction } from './usePageSpeedDial'
import SpeedDialIcon from '../components/SpeedDialIcon'

export function createPageSpeedDialActions({
  onAdd,
  addLabel = 'افزودن',
  onFilter,
  onRefresh,
  refreshDisabled,
  onImport,
  onExport,
  onExportPdf,
  readOnly = false
}: {
  onAdd: () => void
  /** Desktop header pill, e.g. «ثبت چک» (shown as «+ ثبت چک»). */
  addLabel?: string
  onFilter?: () => void
  onRefresh: () => void
  refreshDisabled?: boolean
  onImport?: () => void
  onExport?: () => void
  onExportPdf?: () => void
  /** A role that may only read (round 11): no add, no import. */
  readOnly?: boolean
}): PageSpeedDialAction[] {
  const actions: PageSpeedDialAction[] = [
    {
      id: 'add',
      label: 'افزودن',
      icon: <SpeedDialIcon name="add" />,
      onClick: onAdd,
      headerLabel: `+ ${addLabel}`
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
      label: 'خروجی CSV',
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

  return readOnly
    ? actions.filter(action => action.id !== 'add' && action.id !== 'import')
    : actions
}
