import AppLockSettings from '../AppLockSettings'
import RemindersPage from '../RemindersPage'
import { SettingsSkeleton } from '../skeleton'
import SettingsCustomFormsCard from './SettingsCustomFormsCard'
import SettingsGeneralCard from './SettingsGeneralCard'
import SettingsGoogleAccountCard from './SettingsGoogleAccountCard'
import SettingsPwaInstallCard from './SettingsPwaInstallCard'
import SettingsRemindersCard from './SettingsRemindersCard'
import SettingsSpreadsheetCard from './SettingsSpreadsheetCard'
import type { SettingsPageProps } from './types'
import { useSettingsPage } from './useSettingsPage'

export default function SettingsPage({ onLogout, onSpreadsheetChange }: SettingsPageProps) {
  const settings = useSettingsPage({ onLogout, onSpreadsheetChange })

  const handleToggleEditForm = (formId: string) => {
    settings.setEditingFormId(settings.editingFormId === formId ? null : formId)
  }

  return (
    <div>
      {settings.settingsView === 'reminders' ? (
        <RemindersPage onBack={() => settings.setSettingsView('main')} />
      ) : settings.initialLoading ? (
        <SettingsSkeleton />
      ) : (
        <>
          <SettingsRemindersCard onOpenReminders={() => settings.setSettingsView('reminders')} />

          <AppLockSettings />

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

          <SettingsPwaInstallCard
            isInstalled={settings.isInstalled}
            canInstall={settings.canInstall}
            isIos={settings.isIos}
            showIosHint={settings.showIosHint}
            onInstall={settings.install}
            onDismissIosHint={settings.dismissIosHint}
          />

          <SettingsGeneralCard
            theme={settings.theme}
            currency={settings.currency}
            onThemeChange={settings.handleThemeChange}
            onCurrencyChange={settings.handleCurrencyChange}
          />

          <SettingsCustomFormsCard
            forms={settings.forms}
            categoriesKey={settings.categoriesKey}
            editingFormId={settings.editingFormId}
            loading={settings.loading}
            onToggleEditForm={handleToggleEditForm}
            onSaveCategories={settings.handleSaveCategories}
            onSaveFormFields={settings.handleSaveFormFields}
          />
        </>
      )}
    </div>
  )
}
