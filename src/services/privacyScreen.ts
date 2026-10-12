import { isAppLockEnabled } from './appLock'
import { getDeviceConfig, updateDeviceConfig } from './appLockStorage'
import { isNativePlatform } from './googleAuthNative'

export const PRIVACY_SCREEN_CHANGED_EVENT = 'accounting-privacy-screen-changed'

export const PRIVACY_SCREEN_ANDROID_NOTE =
  'در اندروید، تا وقتی روشن است گرفتن اسکرین‌شات ممکن نیست.'

/** The user's choice on this device; on unless they turned it off. */
export function getPrivacyScreenPreference(): boolean {
  return getDeviceConfig()?.privacyScreen ?? true
}

/** The blur only applies while the app lock is on. */
export function isPrivacyScreenActive(): boolean {
  return isAppLockEnabled() && getPrivacyScreenPreference()
}

export function setPrivacyScreenPreference(enabled: boolean): void {
  updateDeviceConfig({ privacyScreen: enabled })
  window.dispatchEvent(new Event(PRIVACY_SCREEN_CHANGED_EVENT))
}

/**
 * Android: FLAG_SECURE blanks the recents thumbnail and blocks screenshots. The
 * plugin is loaded only on native so the web bundle does not carry it.
 */
export async function applyNativePrivacyScreen(enabled: boolean): Promise<void> {
  if (!isNativePlatform()) return

  try {
    const { PrivacyScreen } = await import('@capacitor-community/privacy-screen')

    await (enabled ? PrivacyScreen.enable() : PrivacyScreen.disable())
  } catch {
    // An APK built before the plugin was added has no native side; nothing to do.
  }
}
