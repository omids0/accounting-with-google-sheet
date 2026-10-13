import { App } from '@capacitor/app'
import { useEffect } from 'react'

import { isBankSmsAvailable } from '../services/bankSmsNative'
import { syncBankSmsNativeSettings } from '../services/bankSmsViewRange'
import { useBankSmsStore } from '../stores/bankSmsStore'

/**
 * Android only: refresh the bank SMS queue on start and on every resume.
 * Notification taps are followed by `useLaunchAction`.
 */
export function useBankSmsSync(): void {
  useEffect(() => {
    if (!isBankSmsAvailable()) return

    const { refresh } = useBankSmsStore.getState()

    // Re-sync the native switch and range (e.g. after an update) before reading the queue.
    void syncBankSmsNativeSettings().then(() => refresh())

    const resume = App.addListener('resume', () => void refresh())

    return () => {
      void resume.then(handle => handle.remove())
    }
  }, [])
}
