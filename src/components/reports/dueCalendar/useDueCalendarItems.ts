import { useCallback, useEffect, useState } from 'react'

import {
  fetchDashboardReminderItems,
  type DashboardReminderItem
} from '../../../services/dashboardReminders'
import { buildDueDatesIcs, dueCalendarHorizonEnd } from '../../../services/dueCalendar'
import { getSettings, isConfigured } from '../../../services/settings'
import { requireAuth } from '../../../utils/authGuard'
import { runExport } from '../../../utils/exportFeedback'
import { diffIsoDays, getTodayIso } from '../../../utils/jalaliDate'
import { saveExportFile } from '../../../utils/saveFile'
import { handleSheetError } from '../../../utils/sheetError'

/**
 * Every due item the calendar shows — installments, checks, dang, personal
 * reminders, vehicle service (the dashboard's reminder sources) — overdue ones
 * plus the next twelve months, and the «افزودن به تقویم گوشی» export.
 */
export function useDueCalendarItems() {
  const [items, setItems] = useState<DashboardReminderItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isConfigured() || !requireAuth()) return

    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    const today = getTodayIso()

    setLoading(true)
    try {
      setItems(
        await fetchDashboardReminderItems(spreadsheetId, {
          limit: Number.POSITIVE_INFINITY,
          horizonDays: diffIsoDays(today, dueCalendarHorizonEnd(today))
        })
      )
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // An explicit export: the file carries real amounts even in hidden-amounts mode.
  const exportIcs = useCallback(
    () =>
      runExport(() => {
        const { content } = buildDueDatesIcs(items)
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })

        return saveExportFile('سررسیدها.ics', blob)
      }, 'ساخت فایل تقویم انجام نشد'),
    [items]
  )

  return { items, loading, reload: load, exportIcs }
}
