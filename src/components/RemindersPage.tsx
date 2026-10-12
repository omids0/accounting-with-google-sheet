import { useNavigate } from 'react-router'

import AdvancedPushSetup from './reminders/AdvancedPushSetup'
import NotificationStatusCard from './reminders/NotificationStatusCard'
import ReminderRulesList from './reminders/ReminderRulesList'
import { useRemindersPage } from './reminders/useRemindersPage'
import Card from './ui/Card'
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
        <Card>
          <p className="m-0 text-[0.85rem] text-muted">در حال بارگذاری...</p>
        </Card>
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
