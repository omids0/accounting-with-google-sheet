import { useNavigate } from 'react-router-dom'

import { SETTINGS_REMINDERS_PATH } from '../../routes/paths'
import AppLockSettings from '../AppLockSettings'
import { SettingsSkeleton } from '../skeleton'
import SettingsCustomFormsCard from './SettingsCustomFormsCard'
import SettingsGeneralCard from './SettingsGeneralCard'
import SettingsGoogleAccountCard from './SettingsGoogleAccountCard'
import SettingsPwaInstallCard from './SettingsPwaInstallCard'
import SettingsRemindersCard from './SettingsRemindersCard'
import SettingsSection from './SettingsSection'
import SettingsSpreadsheetCard from './SettingsSpreadsheetCard'
import type { SettingsPageProps } from './types'
import { useSettingsPage } from './useSettingsPage'

export default function SettingsPage({ onLogout, onSpreadsheetChange }: SettingsPageProps) {
  const navigate = useNavigate()
  const settings = useSettingsPage({ onLogout, onSpreadsheetChange })

  const handleToggleEditForm = (formId: string) => {
    settings.setEditingFormId(settings.editingFormId === formId ? null : formId)
  }

  if (settings.initialLoading) {
    return <SettingsSkeleton />
  }

  return (
    <div className="settings-page">
      <SettingsSection title="عمومی">
        <SettingsGeneralCard
          theme={settings.theme}
          currency={settings.currency}
          onThemeChange={settings.handleThemeChange}
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

      <SettingsSection title="پیشرفته">
        <SettingsCustomFormsCard
          forms={settings.forms}
          categoriesKey={settings.categoriesKey}
          editingFormId={settings.editingFormId}
          loading={settings.loading}
          onToggleEditForm={handleToggleEditForm}
          onSaveCategories={settings.handleSaveCategories}
          onSaveFormFields={settings.handleSaveFormFields}
        />
      </SettingsSection>
    </div>
  )
}
