import CronSetupSection from './reminders/CronSetupSection'
import InstallmentsReminderSection from './reminders/InstallmentsReminderSection'
import PushStatusSection from './reminders/PushStatusSection'
import { useRemindersPage } from './reminders/useRemindersPage'
import Card from './ui/Card'

export default function RemindersPage() {
  const page = useRemindersPage()

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

          <InstallmentsReminderSection
            installmentsRule={page.installmentsRule}
            previewLines={page.previewLines}
            saving={page.saving}
            onUpdateRule={page.updateInstallmentsRule}
            onSave={page.handleSaveRule}
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
