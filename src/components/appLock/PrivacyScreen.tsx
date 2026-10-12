import { useEffect, useState } from 'react'

import { APP_LOCK_CHANGED_EVENT } from '../../services/appLock'
import { isNativePlatform } from '../../services/googleAuthNative'
import {
  applyNativePrivacyScreen,
  isPrivacyScreenActive,
  PRIVACY_SCREEN_CHANGED_EVENT
} from '../../services/privacyScreen'

const overlayClass =
  'fixed inset-0 z-[10001] flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg)_55%,transparent)] backdrop-blur-[16px]'

/**
 * Hides the app's content while it is in the background. Android uses
 * FLAG_SECURE; the web blurs the page on `visibilitychange`, which also covers
 * the moment before the lock screen mounts on return. No transition on purpose.
 */
export default function PrivacyScreen() {
  const [covered, setCovered] = useState(false)

  useEffect(() => {
    if (!isNativePlatform()) return

    const sync = () => void applyNativePrivacyScreen(isPrivacyScreenActive())

    sync()
    window.addEventListener(APP_LOCK_CHANGED_EVENT, sync)
    window.addEventListener(PRIVACY_SCREEN_CHANGED_EVENT, sync)

    return () => {
      window.removeEventListener(APP_LOCK_CHANGED_EVENT, sync)
      window.removeEventListener(PRIVACY_SCREEN_CHANGED_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    if (isNativePlatform()) return

    const onVisibility = () => {
      setCovered(document.visibilityState === 'hidden' && isPrivacyScreenActive())
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  if (!covered) return null

  return (
    <div className={overlayClass} aria-hidden="true">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={72} height={72} />
    </div>
  )
}
