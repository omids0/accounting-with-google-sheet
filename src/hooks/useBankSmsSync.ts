import { App } from '@capacitor/app'
import { useEffect } from 'react'

import { isBankSmsAvailable } from '../services/bankSmsNative'
import { rememberActiveWorkspaceCards } from '../services/bankSmsRouting'
import { loadMissingBuildingCards } from '../services/bankSmsRoutingSync'
import { syncBankSmsNativeSettings } from '../services/bankSmsViewRange'
import { useDataRevision } from '../services/dataRevision'
import { useAppStore } from '../stores/appStore'
import { useBankSmsStore } from '../stores/bankSmsStore'

/**
 * Android only: refresh the bank SMS queue on start and on every resume.
 * Notification taps are followed by `useLaunchAction`.
 */
export function useBankSmsSync(): void {
  const dataRevision = useDataRevision()
  const spreadsheetKey = useAppStore(state => state.spreadsheetKey)

  // The cards of every workspace route captured SMS (bankSmsRouting.ts); keep the open one fresh.
  useEffect(() => {
    rememberActiveWorkspaceCards()
    // Buildings never opened on this device: their cards say which SMS are theirs.
    if (isBankSmsAvailable()) void loadMissingBuildingCards()
  }, [dataRevision, spreadsheetKey])

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
