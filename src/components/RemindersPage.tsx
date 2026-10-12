import { Fragment } from 'react'
import { useNavigate } from 'react-router'

import CronSetupSection from './reminders/CronSetupSection'
import DueDateReminderSection from './reminders/DueDateReminderSection'
import NativeNotificationSection from './reminders/NativeNotificationSection'
import NativePermissionPrompt from './reminders/NativePermissionPrompt'
import PersonalRemindersPushSection from './reminders/PersonalRemindersPushSection'
import PushStatusSection from './reminders/PushStatusSection'
import type { ReminderSaveKind } from './reminders/useNativeReminderPermission'
import { useRemindersPage } from './reminders/useRemindersPage'
import { isNativePlatform } from '../services/googleAuthNative'
import {
  VehicleDeadlineReminderSection,
  VehicleMileageReminderSection,
  VehiclePeriodicReminderSection
} from './reminders/VehicleReminderSections'
import Card from './ui/Card'
import { remindersPageClass } from './ui/reminderStyles'

const DUE_DATE_KINDS = ['installments', 'checks', 'dang'] as const

export default function RemindersPage() {
  const page = useRemindersPage()
  const navigate = useNavigate()

  const permissionPrompt = (kind: ReminderSaveKind) =>
    page.nativePermission.blockedKind === kind && (
      <NativePermissionPrompt
        denied={page.nativePermission.denied}
        requesting={page.nativePermission.requesting}
        onGrant={page.handleGrantNotificationPermission}
        onDismiss={page.nativePermission.dismiss}
      />
    )

  return (
    <div className={remindersPageClass}>
      {page.loading ? (
        <Card>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            در حال بارگذاری...
          </p>
        </Card>
      ) : (
        <>
          {isNativePlatform() ? (
            <NativeNotificationSection />
          ) : (
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
          )}

          {DUE_DATE_KINDS.map(kind => (
            <Fragment key={kind}>
              <DueDateReminderSection
                kind={kind}
                rule={page.rules[kind]}
                previewLines={page.previewLinesByKind[kind]}
                saving={page.savingKind === kind}
                onUpdateRule={patch => page.updateRule(kind, patch)}
                onSave={() => page.handleSaveRule(kind)}
              />
              {permissionPrompt(kind)}
            </Fragment>
          ))}

          <PersonalRemindersPushSection
            personalRule={page.personalRule}
            saving={page.savingKind === 'personal'}
            onUpdateRule={page.updatePersonalRule}
            onSave={() => page.handleSaveRule('personal')}
            onManage={() => navigate('/reminders')}
          />
          {permissionPrompt('personal')}

          <VehicleMileageReminderSection
            rule={page.vehicleMileageRule}
            saving={page.savingKind === 'vehicle-mileage'}
            onUpdateRule={page.updateVehicleMileageRule}
            onSave={() => page.handleSaveRule('vehicle-mileage')}
          />
          {permissionPrompt('vehicle-mileage')}

          <VehicleDeadlineReminderSection
            rule={page.vehicleDeadlineRule}
            saving={page.savingKind === 'vehicle-deadline'}
            onUpdateRule={page.updateVehicleDeadlineRule}
            onSave={() => page.handleSaveRule('vehicle-deadline')}
          />
          {permissionPrompt('vehicle-deadline')}

          <VehiclePeriodicReminderSection
            rule={page.vehiclePeriodicRule}
            saving={page.savingKind === 'vehicle-periodic-service'}
            onUpdateRule={page.updateVehiclePeriodicRule}
            onSave={() => page.handleSaveRule('vehicle-periodic-service')}
          />
          {permissionPrompt('vehicle-periodic-service')}

          <CronSetupSection
            showSetup={page.showSetup}
            onToggle={() => page.setShowSetup(value => !value)}
          />
        </>
      )}
    </div>
  )
}
