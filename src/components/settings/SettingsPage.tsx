import { useNavigate } from 'react-router'

import SettingsBackupCard from './backup/SettingsBackupCard'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { SETTINGS_REMINDERS_PATH } from '../../routes/paths'
import AppLockSettings from '../AppLockSettings'
import ConfirmActionModal from '../ConfirmActionModal'
import { SettingsSkeleton } from '../skeleton'
import SettingsBudgetsCard from './SettingsBudgetsCard'
import SettingsCategoriesCard from './SettingsCategoriesCard'
import SettingsGeneralCard from './SettingsGeneralCard'
import SettingsGoogleAccountCard from './SettingsGoogleAccountCard'
import SettingsPwaInstallCard from './SettingsPwaInstallCard'
import SettingsRecurringCard from './SettingsRecurringCard'
import SettingsRemindersCard from './SettingsRemindersCard'
import SettingsSection from './SettingsSection'
import SettingsSpreadsheetCard from './SettingsSpreadsheetCard'
import SettingsTwoPane, { type SettingsSectionConfig } from './SettingsTwoPane'
import SettingsVaultAssetsCard from './SettingsVaultAssetsCard'
import SheetSwitchConfirmModal from './SheetSwitchConfirmModal'
import { useSettingsPage } from './useSettingsPage'
import {
  settingsActiveSheetClass,
  settingsActiveSheetNameClass,
  settingsPageClass
} from '../ui/settingsStyles'

/** Accordion sections on phones and tablets; a section list + content pane on desktop. */
export default function SettingsPage() {
  const navigate = useNavigate()
  const settings = useSettingsPage()
  const isDesktop = useIsDesktop()

  if (settings.initialLoading) {
    return <SettingsSkeleton />
  }

  const sections: SettingsSectionConfig[] = [
    {
      id: 'general',
      title: 'عمومی',
      icon: 'settings',
      description: 'واحد پول و نصب اپ روی گوشی',
      content: (
        <>
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
        </>
      )
    },
    {
      id: 'account',
      title: 'حساب و داده',
      icon: 'folder',
      description: 'حساب گوگل، شیت داده‌ها و پشتیبان',
      content: (
        <>
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
          {settings.spreadsheetId ? (
            <SettingsBackupCard spreadsheetId={settings.spreadsheetId} />
          ) : null}
        </>
      )
    },
    ...(settings.spreadsheetId
      ? [
          {
            id: 'vault-assets',
            title: 'دارایی‌های صندوقچه',
            icon: 'treasury' as const,
            description: 'نام، اعشار، قیمت دستی و غیرفعال کردن دارایی‌ها',
            content: <SettingsVaultAssetsCard spreadsheetId={settings.spreadsheetId} />
          },
          {
            id: 'categories',
            title: 'دسته‌ها',
            icon: 'records' as const,
            description: 'ترتیب، زیردسته، ادغام و دسته‌های پیشنهادی',
            content: <SettingsCategoriesCard />
          },
          {
            id: 'budgets',
            title: 'بودجه‌ها',
            icon: 'chart' as const,
            description: 'بودجه ماهانه دسته‌های هزینه',
            content: <SettingsBudgetsCard />
          },
          {
            id: 'recurring',
            title: 'تکرارها',
            icon: 'refresh' as const,
            description: 'تراکنش‌های ماهانه: یادآوری یا ثبت خودکار',
            content: <SettingsRecurringCard />
          }
        ]
      : []),
    {
      id: 'security',
      title: 'امنیت',
      icon: 'lock',
      description: 'قفل اپ با رمز و اثر انگشت',
      content: <AppLockSettings />
    },
    {
      id: 'notifications',
      title: 'اعلان‌ها',
      icon: 'bell',
      description: 'یادآورها و اعلان‌های سررسید',
      content: <SettingsRemindersCard onOpenReminders={() => navigate(SETTINGS_REMINDERS_PATH)} />
    }
  ]

  return (
    <div className={settingsPageClass}>
      {settings.activeSheetName && (
        <p className={settingsActiveSheetClass}>
          شیت فعال: <span className={settingsActiveSheetNameClass}>{settings.activeSheetName}</span>
        </p>
      )}
      <SheetSwitchConfirmModal {...settings.switchGuardModalProps} />

      {isDesktop ? (
        <SettingsTwoPane sections={sections} />
      ) : (
        sections.map(({ id, content, ...section }) => (
          <SettingsSection key={id} {...section}>
            {content}
          </SettingsSection>
        ))
      )}
    </div>
  )
}
