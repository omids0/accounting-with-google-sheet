import { countRecordRows } from '../../services/onboarding'
import { getSettings } from '../../services/settings'
import { useNavigationStore } from '../../stores/navigationStore'
import EmptyState from '../EmptyState'

interface DashboardEmptyRecordsProps {
  onShowPreviousMonth: () => void
}

/** Empty period on the dashboard: only a sheet with no records at all gets the first-entry wording. */
export default function DashboardEmptyRecords({ onShowPreviousMonth }: DashboardEmptyRecordsProps) {
  const spreadsheetId = getSettings()?.spreadsheetId

  const openEntry = () => useNavigationStore.getState().onOpenEntry()

  // null means some tabs are not cached yet; assume a returning user rather than greet them as new.
  if (spreadsheetId && countRecordRows(spreadsheetId, 1) === 0) {
    return (
      <EmptyState
        icon="records"
        message="هنوز تراکنشی در این دوره ثبت نشده"
        action={{ label: 'ثبت اولین تراکنش', onClick: openEntry }}
      />
    )
  }

  return (
    <EmptyState
      icon="records"
      message="در این بازه تراکنشی نیست"
      secondaryAction={{ label: 'ماه قبل', onClick: onShowPreviousMonth }}
      action={{ label: 'ثبت تراکنش', onClick: openEntry }}
    />
  )
}
