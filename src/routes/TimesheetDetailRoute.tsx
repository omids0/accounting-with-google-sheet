import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useLayoutOutletContext } from './layoutOutletContext'
import { LazyTimesheetDetailPage } from './lazyPages'
import { TimesheetDetailListSkeleton } from '../components/skeleton'
import { getSettings } from '../services/settings'
import { fetchTimesheets } from '../services/timesheet'
import type { Timesheet } from '../types'
import { handleSheetError } from '../utils/sheetError'

export default function TimesheetDetailRoute() {
  const { timesheetId } = useParams<{ timesheetId: string }>()
  const navigate = useNavigate()
  const { onReauth } = useLayoutOutletContext()
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const settings = getSettings()

      if (!settings?.spreadsheetId || !timesheetId) {
        if (!cancelled) setLoading(false)

        return
      }

      try {
        const items = await fetchTimesheets(settings.spreadsheetId)

        if (!cancelled) {
          setTimesheet(items.find(item => item.id === timesheetId) ?? null)
          setLoading(false)
        }
      } catch (error) {
        handleSheetError(error, { onReauth })

        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [onReauth, timesheetId])

  if (loading) {
    return <TimesheetDetailListSkeleton />
  }

  if (!timesheet) {
    return (
      <div className="empty-state">
        <p>تایم‌شیت یافت نشد</p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/timesheets')}
        >
          بازگشت به لیست
        </button>
      </div>
    )
  }

  return <LazyTimesheetDetailPage timesheet={timesheet} onReauth={onReauth} />
}
