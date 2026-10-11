import { setBankSmsCaptureEnabled, setBankSmsNativeViewDays } from './bankSmsNative'
import { getBankSmsPrefs, updateBankSmsPrefs } from './bankSmsPrefs'

/**
 * The review page range also decides what the phone notifies about, so the
 * notification count always matches the list the user opens.
 */
export async function applyBankSmsViewDays(days: number): Promise<void> {
  updateBankSmsPrefs({ viewDays: days })
  // An app build older than this method still works; it just counts the whole queue.
  await setBankSmsNativeViewDays(days).catch(() => undefined)
}

/** App start: native settings may be stale after an update or reinstall. */
export async function syncBankSmsNativeSettings(): Promise<void> {
  const { enabled, viewDays } = getBankSmsPrefs()

  await setBankSmsCaptureEnabled(enabled).catch(() => undefined)
  await setBankSmsNativeViewDays(viewDays).catch(() => undefined)
}
