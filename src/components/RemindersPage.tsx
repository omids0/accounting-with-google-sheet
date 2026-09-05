import { useNavigate } from 'react-router-dom'

import CronSetupSection from './reminders/CronSetupSection'
import DueDateReminderSection from './reminders/DueDateReminderSection'
import PersonalRemindersPushSection from './reminders/PersonalRemindersPushSection'
import PushStatusSection from './reminders/PushStatusSection'
import { useRemindersPage } from './reminders/useRemindersPage'
import Card from './ui/Card'

const DUE_DATE_KINDS = ['installments', 'checks', 'dang'] as const

export default function RemindersPage() {
  const page = useRemindersPage()
  const navigate = useNavigate()

  return (
    <div>
      {page.loading ? (
        <Card>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            در حال بارگذاری...
          </p>
        </Card>
      ) : (
        <>
          <PushStatusSection
            pushStatus={page.pushStatus}
            permission={page.permission}
            swStatus={page.swStatus}
            isInstalled={page.isInstalled}
            hasSubscription={page.hasSubscription}
            saving={page.saving}
            canInstall={page.canInstall}
            isIos={page.isIos}
            showIosHint={page.showIosHint}
            install={page.install}
            dismissIosHint={page.dismissIosHint}
            onEnablePush={page.handleEnablePush}
            onDisablePush={page.handleDisablePush}
            onTestNotification={page.handleTestNotification}
          />

          {DUE_DATE_KINDS.map(kind => (
            <DueDateReminderSection
              key={kind}
              kind={kind}
              rule={page.rules[kind]}
              previewLines={page.previewLinesByKind[kind]}
              saving={page.savingKind === kind}
              onUpdateRule={patch => page.updateRule(kind, patch)}
              onSave={() => page.handleSaveRule(kind)}
            />
          ))}

          <PersonalRemindersPushSection
            personalRule={page.personalRule}
            saving={page.savingKind === 'personal'}
            onUpdateRule={page.updatePersonalRule}
            onSave={() => page.handleSaveRule('personal')}
            onManage={() => navigate('/reminders')}
          />

          <CronSetupSection
            showSetup={page.showSetup}
            onToggle={() => page.setShowSetup(value => !value)}
          />
        </>
      )}
    </div>
  )
}
