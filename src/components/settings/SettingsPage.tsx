import { useNavigate } from 'react-router-dom'

import { SETTINGS_REMINDERS_PATH } from '../../routes/paths'
import AppLockSettings from '../AppLockSettings'
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
      <SettingsSection title="عمومی">
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

      <SettingsSection title="حساب و داده">
        <SettingsGoogleAccountCard onLogout={settings.handleLogout} />

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
          />
        )}
      </SettingsSection>

      <SettingsSection title="امنیت">
        <AppLockSettings />
      </SettingsSection>

      <SettingsSection title="اعلان‌ها">
        <SettingsRemindersCard onOpenReminders={() => navigate(SETTINGS_REMINDERS_PATH)} />
      </SettingsSection>
    </div>
  )
}
