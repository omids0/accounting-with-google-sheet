import { useNavigate, useParams } from 'react-router'

import { LazyTimesheetDetailPage } from './lazyPages'
import { TimesheetDetailListSkeleton } from '../components/skeleton'
import Button from '../components/ui/Button'
import { emptyStateClass } from '../components/ui/displayStyles'
import { useRouteRecord } from '../hooks/useRouteRecord'
import type { Timesheet } from '../types'

async function fetchAllTimesheets(spreadsheetId: string): Promise<Timesheet[]> {
  const { fetchTimesheets } = await import('../services/timesheet')

  return fetchTimesheets(spreadsheetId)
}

export default function TimesheetDetailRoute() {
  const { timesheetId } = useParams<{ timesheetId: string }>()
  const navigate = useNavigate()
  const { record: timesheet, loading } = useRouteRecord(timesheetId, fetchAllTimesheets)

  if (loading) {
    return <TimesheetDetailListSkeleton />
  }

  if (!timesheet) {
    return (
      <div className={emptyStateClass}>
        <p>تایم‌شیت یافت نشد</p>
        <Button type="button" variant="primary" size="sm" onClick={() => navigate('/timesheets')}>
          بازگشت به لیست
        </Button>
      </div>
    )
  }

  return <LazyTimesheetDetailPage timesheet={timesheet} />
}
