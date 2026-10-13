import { useEffect, useState } from 'react'

import {
  getMonthlyReportState,
  subscribeMonthlyReport,
  type MonthlyReportState
} from '../../../services/monthlyReportGate'

/** The first-of-month row's state for a spreadsheet, re-read on every change. */
export function useMonthlyReportState(spreadsheetId: string | undefined): MonthlyReportState {
  const [state, setState] = useState(() =>
    spreadsheetId ? getMonthlyReportState(spreadsheetId) : {}
  )

  useEffect(() => {
    if (!spreadsheetId) return

    const read = () => setState(getMonthlyReportState(spreadsheetId))

    read()

    return subscribeMonthlyReport(read)
  }, [spreadsheetId])

  return state
}
