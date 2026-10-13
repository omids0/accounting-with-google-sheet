import DisplaySwitchRow from './display/DisplaySwitchRow'
import { setMonthlyReportOn } from '../../services/monthlyReportGate'
import { useMonthlyReportState } from '../reports/monthly/useMonthlyReportState'
import Card from '../ui/Card'

/** Settings › «گزارش‌ها»: the first-of-month report row on the dashboard (default on). */
export default function SettingsReportsCard({ spreadsheetId }: { spreadsheetId: string }) {
  const state = useMonthlyReportState(spreadsheetId)

  return (
    <Card>
      <DisplaySwitchRow
        title="گزارش ماهانه"
        hint="اول هر ماه بعد از ساعت ۹ گزارش یک‌صفحه‌ای ماه قبل روی داشبورد؛ همیشه در گزارش‌ها › گزارش ماهانه"
        checked={!state.off}
        onChange={on => setMonthlyReportOn(spreadsheetId, on)}
      />
    </Card>
  )
}
