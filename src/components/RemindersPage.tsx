import AppIcon from './AppIcon'
import CronSetupSection from './reminders/CronSetupSection'
import InstallmentsReminderSection from './reminders/InstallmentsReminderSection'
import PushStatusSection from './reminders/PushStatusSection'
import { useRemindersPage } from './reminders/useRemindersPage'

interface RemindersPageProps {
  onBack: () => void
}

export default function RemindersPage({ onBack }: RemindersPageProps) {
  const page = useRemindersPage()

  return (
    <div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onBack}
        style={{ marginBottom: '0.75rem' }}
      >
        <AppIcon name="back" size={16} strokeWidth={2} />
        <span style={{ marginInlineStart: '0.35rem' }}>بازگشت به تنظیمات</span>
      </button>

      {page.loading ? (
        <div className="card">
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            در حال بارگذاری...
          </p>
        </div>
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
