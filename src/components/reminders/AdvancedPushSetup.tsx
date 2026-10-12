import { useEffect, useMemo, useState } from 'react'

import CronSetupSection from './CronSetupSection'
import PushStatusSection from './PushStatusSection'
import { createRemindersPushHandlers } from './useRemindersPushHandlers'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { isNativePlatform } from '../../services/googleAuthNative'
import {
  getCurrentPushSubscription,
  getNotificationPermission,
  getPushSupportStatus,
  getServiceWorkerStatus,
  type ServiceWorkerStatus
} from '../../services/pushNotifications'
import { AccordionCollapse } from '../AccordionCollapse'
import { reminderAdvancedToggleClass } from '../ui/reminderStyles'

interface AdvancedPushSetupProps {
  spreadsheetId: string
  /** Lets the status line follow a change made here. */
  onChanged: () => void
}

function AdvancedPushPanels({ spreadsheetId, onChanged }: AdvancedPushSetupProps) {
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>('pending')
  const [showCron, setShowCron] = useState(false)
  const pwa = usePwaInstall()

  useEffect(() => {
    let cancelled = false

    void Promise.all([getCurrentPushSubscription(), getServiceWorkerStatus()])
      .then(([subscription, status]) => {
        if (cancelled) return
        setHasSubscription(!!subscription?.endpoint)
        setSwStatus(status)
      })
      .catch(() => {
        if (!cancelled) setSwStatus('missing')
      })

    return () => {
      cancelled = true
    }
  }, [version])

  const handlers = useMemo(
    () =>
      createRemindersPushHandlers({
        spreadsheetId,
        setBusy,
        onChanged: () => {
          setVersion(value => value + 1)
          onChanged()
        }
      }),
    [spreadsheetId, onChanged]
  )

  return (
    <>
      <PushStatusSection
        pushStatus={getPushSupportStatus()}
        permission={getNotificationPermission()}
        swStatus={swStatus}
        isInstalled={pwa.isInstalled}
        hasSubscription={hasSubscription}
        saving={busy}
        canInstall={pwa.canInstall}
        isIos={pwa.isIos}
        showIosHint={pwa.showIosHint}
        install={pwa.install}
        dismissIosHint={pwa.dismissIosHint}
        onEnablePush={handlers.handleEnablePush}
        onDisablePush={handlers.handleDisablePush}
        onTestNotification={handlers.handleTestNotification}
      />
      <CronSetupSection showSetup={showCron} onToggle={() => setShowCron(value => !value)} />
    </>
  )
}

/** Web push plumbing for whoever runs the sheet's cron; the APK never needs it. */
export default function AdvancedPushSetup(props: AdvancedPushSetupProps) {
  const [open, setOpen] = useState(false)

  if (isNativePlatform()) return null

  return (
    <div>
      <button
        type="button"
        className={reminderAdvancedToggleClass}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        تنظیمات پیشرفته (برای توسعه‌دهنده) {open ? '▴' : '▾'}
      </button>
      <AccordionCollapse open={open}>
        <AdvancedPushPanels {...props} />
      </AccordionCollapse>
    </div>
  )
}
