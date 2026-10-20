import { useEffect } from 'react'

import { readBridgePrefs } from '../services/bridgePrefs'
import { getSettings, getSpreadsheets } from '../services/settings'
import { hasPendingOutbox } from '../services/syncOutbox'
import { useAppStore } from '../stores/appStore'

/** True when a bridge left writes for a workspace that is not open, or a payment waiting to be written. */
function hasBridgeWork(): boolean {
  const active = getSettings()?.spreadsheetId

  return (
    readBridgePrefs().payments.length > 0 ||
    getSpreadsheets().some(entry => entry.id !== active && hasPendingOutbox(entry.id))
  )
}

/**
 * Sends what the bridges to the personal spreadsheet could not send when they were written (round
 * 11, Step 8): on start, when the device is back online, when the app returns to the foreground and
 * after a switch of workspace. Cheap when nothing is waiting; the bridge code loads only if needed.
 */
export function useBridgeDrain(): void {
  const spreadsheetKey = useAppStore(state => state.spreadsheetKey)

  useEffect(() => {
    const run = () => {
      if (!hasBridgeWork() || (typeof navigator !== 'undefined' && !navigator.onLine)) return

      void import('../services/buildingBridge').then(({ drainAllBridges }) => drainAllBridges())
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }

    run()
    window.addEventListener('online', run)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('online', run)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [spreadsheetKey])
}
