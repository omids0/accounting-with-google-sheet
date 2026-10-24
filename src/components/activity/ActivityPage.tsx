import { useMemo } from 'react'

import ActivityList from './ActivityList'
import { activityPerson, activityWhen } from './activityText'
import { ALL, useActivityPage } from './useActivityPage'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import type { ActivityEntry } from '../../services/activityLog'
import { ACTIVITY_ACTION_LABELS } from '../../services/activityLogText'
import { exportSheetCsv } from '../../services/importExport'
import type { SharingInfo } from '../../services/sharing'
import { ACTIVITY_LOG_HEADERS } from '../../services/sheetHeaders'
import { ACTIVITY_LOG_SHEET } from '../../services/sheetNames'
import CalmBlock from '../CalmBlock'
import EmptyState from '../EmptyState'
import { CalmRowsSkeleton } from '../skeleton'
import SpeedDialIcon from '../SpeedDialIcon'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import ToggleChipGroup from '../ToggleChipGroup'
import Button from '../ui/Button'
import { searchChipsClass } from '../ui/searchStyles'
import { activityFiltersClass, activityMoreClass, activityPageClass } from '../ui/writerStyles'
import WriterAvatar from '../WriterAvatar'

function exportActivityCsv(spreadsheetId: string) {
  return exportSheetCsv(spreadsheetId, ACTIVITY_LOG_SHEET, ACTIVITY_LOG_HEADERS, 'فعالیت‌ها.csv')
}

function activityColumns(
  info: SharingInfo | null,
  moduleLabel: (id: string) => string
): DataTableColumn<ActivityEntry>[] {
  return [
    {
      id: 'at',
      header: 'زمان',
      sortValue: entry => entry.at,
      className: 'whitespace-nowrap text-muted',
      cell: entry => activityWhen(entry.at)
    },
    {
      id: 'person',
      header: 'نفر',
      className: 'whitespace-nowrap',
      cell: entry => (
        <>
          <WriterAvatar email={entry.email} always />
          {activityPerson(entry.email, info, entry.name)}
        </>
      )
    },
    {
      id: 'action',
      header: 'عمل',
      className: 'whitespace-nowrap',
      cell: entry =>
        `${ACTIVITY_ACTION_LABELS[entry.action] ?? entry.action} · ${moduleLabel(entry.module)}`
    },
    {
      id: 'summary',
      header: 'خلاصه',
      // A long unbroken name must wrap inside the cell, not stretch the whole table.
      className: 'min-w-[12rem] [overflow-wrap:anywhere]',
      cell: entry => entry.summary
    },
    { id: 'device', header: 'دستگاه', className: 'whitespace-nowrap', cell: e => e.device }
  ]
}

/** «فعالیت» (Settings → فعالیت): who changed what, when and from which device. */
export default function ActivityPage() {
  const page = useActivityPage()
  const isDesktop = useIsDesktop()
  const { handleExport } = useSheetImportExport({ exportFn: exportActivityCsv })
  const { refresh, loading, info, moduleLabel } = page

  const speedDial = useMemo(
    () => ({
      ariaLabel: 'عملیات فعالیت',
      actions: [
        {
          id: 'export',
          label: 'خروجی CSV',
          icon: <SpeedDialIcon name="export" />,
          onClick: handleExport
        },
        {
          id: 'refresh',
          label: 'بروزرسانی',
          icon: <SpeedDialIcon name="refresh" />,
          onClick: refresh,
          disabled: loading
        }
      ]
    }),
    [handleExport, loading, refresh]
  )

  useRegisterPageSpeedDial(speedDial)

  const columns = useMemo(() => activityColumns(info, moduleLabel), [info, moduleLabel])

  return (
    <div className={activityPageClass}>
      <div className={activityFiltersClass}>
        <div className={searchChipsClass}>
          <ToggleChipGroup
            ariaLabel="نفر"
            options={page.people}
            selected={{ [page.person]: true }}
            onToggle={page.choosePerson}
          />
        </div>
        <div className={searchChipsClass}>
          <ToggleChipGroup
            ariaLabel="بخش"
            options={page.modules}
            selected={{ [page.module]: true }}
            onToggle={page.chooseModule}
          />
        </div>
      </div>

      {page.loading ? (
        <CalmBlock title="فعالیت">
          <CalmRowsSkeleton count={6} badge />
        </CalmBlock>
      ) : !page.total ? (
        <EmptyState
          icon="clock"
          message={page.person === ALL && page.module === ALL ? 'هنوز فعالیتی نیست' : 'موردی نیست'}
          description="هر ثبت، ویرایش، حذف و پرداخت این‌جا با نام ثبت‌کننده و دستگاه می‌آید."
        />
      ) : isDesktop ? (
        <DataTable label="فعالیت" rows={page.visible} columns={columns} rowKey={e => e.id} />
      ) : (
        <CalmBlock title="فعالیت">
          <ActivityList entries={page.visible} info={page.info} />
        </CalmBlock>
      )}

      {page.hasMore ? (
        <Button variant="secondary" size="sm" className={activityMoreClass} onClick={page.showMore}>
          بیشتر
        </Button>
      ) : null}
    </div>
  )
}
