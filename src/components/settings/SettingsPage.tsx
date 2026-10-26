import { useNavigate } from 'react-router'

import SettingsBackupCard from './backup/SettingsBackupCard'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useSharedCan } from '../../hooks/useSharedCan'
import { useIsSharedWorkspace, useWorkspaceType } from '../../hooks/useWorkspaceType'
import { SETTINGS_REMINDERS_PATH } from '../../routes/paths'
import AppLockSettings from '../AppLockSettings'
import ConfirmActionModal from '../ConfirmActionModal'
import { SettingsSkeleton } from '../skeleton'
import SettingsDisplayCard from './display/SettingsDisplayCard'
import SettingsActivityCard from './SettingsActivityCard'
import SettingsBudgetsCard from './SettingsBudgetsCard'
import SettingsCategoriesCard from './SettingsCategoriesCard'
import SettingsCloseYearCard from './SettingsCloseYearCard'
import SettingsColumnRepairCard from './SettingsColumnRepairCard'
import SettingsGeneralCard from './SettingsGeneralCard'
import SettingsGoogleAccountCard from './SettingsGoogleAccountCard'
import SettingsPwaInstallCard from './SettingsPwaInstallCard'
import SettingsRecurringCard from './SettingsRecurringCard'
import SettingsRemindersCard from './SettingsRemindersCard'
import SettingsReportsCard from './SettingsReportsCard'
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
  // A shared account: no personal-only sections, and writes only for the roles that hold them.
  const isShared = useIsSharedWorkspace()
  // Reminders and push keys are written to the personal sheet only (a building's board reads it).
  const isPersonal = useWorkspaceType() === 'personal'
  const canBudget = useSharedCan('budget')
  const canExport = useSharedCan('export')
  const canRepair = useSharedCan('editOthers')
  const hidden: Partial<Record<string, boolean>> = {
    'vault-assets': isShared,
    categories: !canBudget,
    budgets: !canBudget,
    // Nothing is automatic in a shared account (spec non-goals): no recurring items.
    recurring: isShared || !canBudget,
    notifications: !isPersonal
  }

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
      id: 'display',
      title: 'نمایش',
      icon: 'sun',
      description: 'اندازهٔ متن، تم، انیمیشن، کنتراست، ارقام و لرزش',
      content: <SettingsDisplayCard />
    },
    {
      id: 'account',
      title: 'حساب و داده',
      icon: 'folder',
      // A shared account has no «بستن سال», and backup only with «خروجی و پشتیبان».
      description: !isShared
        ? 'حساب گوگل، شیت داده‌ها، پشتیبان و بستن سال'
        : canExport
        ? 'حساب گوگل، شیت داده‌ها و پشتیبان'
        : 'حساب گوگل و شیت داده‌ها',
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
            <>
              {canExport ? <SettingsBackupCard spreadsheetId={settings.spreadsheetId} /> : null}
              {isShared ? null : <SettingsCloseYearCard />}
              {canRepair ? (
                <SettingsColumnRepairCard spreadsheetId={settings.spreadsheetId} />
              ) : null}
            </>
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
            id: 'activity',
            title: 'فعالیت',
            icon: 'clock' as const,
            description: 'چه کسی چه چیزی را کی و از کدام دستگاه عوض کرد',
            content: <SettingsActivityCard />
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
          },
          {
            id: 'reports',
            title: 'گزارش‌ها',
            icon: 'pdf' as const,
            description: 'گزارش ماهانه اول هر ماه',
            content: <SettingsReportsCard spreadsheetId={settings.spreadsheetId} />
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
  const shown = sections.filter(section => !hidden[section.id])

  return (
    <div className={settingsPageClass}>
      {settings.activeSheetName && (
        <p className={settingsActiveSheetClass}>
          شیت فعال: <span className={settingsActiveSheetNameClass}>{settings.activeSheetName}</span>
        </p>
      )}
      <SheetSwitchConfirmModal {...settings.switchGuardModalProps} />

      {isDesktop ? (
        <SettingsTwoPane sections={shown} />
      ) : (
        shown.map(({ id, content, ...section }) => (
          <SettingsSection key={id} {...section}>
            {content}
          </SettingsSection>
        ))
      )}
    </div>
  )
}
