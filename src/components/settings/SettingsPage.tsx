import { useNavigate } from 'react-router'

import { SETTINGS_REMINDERS_PATH } from '../../routes/paths'
import AppLockSettings from '../AppLockSettings'
import ConfirmActionModal from '../ConfirmActionModal'
import { SettingsSkeleton } from '../skeleton'
import SettingsGeneralCard from './SettingsGeneralCard'
import SettingsGoogleAccountCard from './SettingsGoogleAccountCard'
import SettingsPwaInstallCard from './SettingsPwaInstallCard'
import SettingsRemindersCard from './SettingsRemindersCard'
import SettingsSection from './SettingsSection'
import SettingsSpreadsheetCard from './SettingsSpreadsheetCard'
import { useSettingsPage } from './useSettingsPage'
import { settingsPageClass } from '../ui/settingsStyles'

export default function SettingsPage() {
  const navigate = useNavigate()
  const settings = useSettingsPage()

  if (settings.initialLoading) {
    return <SettingsSkeleton />
  }

  return (
    <div className={settingsPageClass}>
      <SettingsSection title="عمومی" icon="settings" description="واحد پول و نصب اپ روی گوشی">
        <SettingsGeneralCard
          currency={settings.currency}
          onCurrencyChange={settings.handleCurrencyChange}
        />

        <SettingsPwaInstallCard
          isInstalled={settings.isInstalled}
          canInstall={settings.canInstall}
          isIos={settings.isIos}
          showIosHint={settings.showIosHint}
          onInstall={settings.install}
          onDismissIosHint={settings.dismissIosHint}
        />
      </SettingsSection>

      <SettingsSection title="حساب و داده" icon="folder" description="حساب گوگل و شیت داده‌ها">
        <SettingsGoogleAccountCard onLogout={settings.handleLogout} />
        <ConfirmActionModal {...settings.logoutModalProps} />

        {(settings.spreadsheetId || settings.spreadsheets.length > 0) && (
          <SettingsSpreadsheetCard
            spreadsheetId={settings.spreadsheetId}
            spreadsheets={settings.spreadsheets}
            newSheetName={settings.newSheetName}
            showNewSheetForm={settings.showNewSheetForm}
            loading={settings.loading}
            onNewSheetNameChange={settings.setNewSheetName}
            onShowNewSheetForm={() => settings.setShowNewSheetForm(true)}
            onCancelNewSheetForm={settings.cancelNewSheetForm}
            onRefreshSpreadsheets={settings.handleRefreshSpreadsheets}
            onCreateSpreadsheet={settings.handleCreateSpreadsheet}
            onSwitchSpreadsheet={settings.handleSwitchSpreadsheet}
            sheetPicker={settings.sheetPicker}
          />
        )}
      </SettingsSection>

      <SettingsSection title="امنیت" icon="lock" description="قفل اپ با رمز و اثر انگشت">
        <AppLockSettings />
      </SettingsSection>

      <SettingsSection title="اعلان‌ها" icon="bell" description="یادآورها و اعلان‌های سررسید">
        <SettingsRemindersCard onOpenReminders={() => navigate(SETTINGS_REMINDERS_PATH)} />
      </SettingsSection>
    </div>
  )
}
