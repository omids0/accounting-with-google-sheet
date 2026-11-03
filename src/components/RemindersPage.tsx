import { useNavigate } from 'react-router'

import LoadErrorState from './LoadErrorState'
import AdvancedPushSetup from './reminders/AdvancedPushSetup'
import NotificationStatusCard from './reminders/NotificationStatusCard'
import ReminderRulesList from './reminders/ReminderRulesList'
import { useRemindersPage } from './reminders/useRemindersPage'
import { CalmRowsSkeleton } from './skeleton'
import { remindersPageClass } from './ui/reminderStyles'
import { getPathForTab } from '../routes/paths'

export default function RemindersPage() {
  const page = useRemindersPage()
  const navigate = useNavigate()

  return (
    <div className={remindersPageClass}>
      <NotificationStatusCard
        permission={page.permission}
        onGrant={() => void page.grantPermission()}
      />

      {page.loading ? (
        <div role="status" aria-busy="true" aria-label="در حال بارگذاری">
          <CalmRowsSkeleton count={4} />
        </div>
      ) : page.loadFailed ? (
        <LoadErrorState icon="bell" onRetry={page.reload} />
      ) : (
        <ReminderRulesList
          rules={page.rules}
          savingKind={page.savingKind}
          hasVehicle={page.hasVehicle}
          permission={page.permission}
          onChange={(kind, patch) => void page.changeRule(kind, patch)}
          onGrant={() => void page.grantPermission()}
          onManagePersonal={() => navigate(getPathForTab('personal-reminders'))}
        />
      )}

      <AdvancedPushSetup spreadsheetId={page.spreadsheetId} onChanged={page.permission.refresh} />
    </div>
  )
}
