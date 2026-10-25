import { useEffect, useReducer } from 'react'

import { getUserEmail } from '../services/auth'
import { readNotices, refreshNotices, subscribeNotices } from '../services/sharedNotices'
import { subscribeStore } from '../services/spreadsheetStore'
import { isSharedAccountHidden, sharedSpreadsheetId } from '../services/workspace'

/**
 * This user's change notices of the device's shared account: read when a page showing them opens
 * (at most every `SHARED_NOTICE_REFRESH_MS`, never while hidden or for a file this device cannot
 * read). Only lazy chunks import it, so a user without a shared account never downloads it.
 */
export function useSharedNotices() {
  const sharedId = sharedSpreadsheetId() ?? ''
  const on = !!sharedId && !isSharedAccountHidden(sharedId)
  const [, rerender] = useReducer((count: number) => count + 1, 0)

  useEffect(() => {
    if (!on) return

    const offNotices = subscribeNotices(rerender)
    // The shared sheet open here: its mirror follows every sync.
    const offStore = subscribeStore(rerender)

    void refreshNotices(sharedId)

    return () => {
      offNotices()
      offStore()
    }
  }, [on, sharedId])

  return { sharedId, notices: on ? readNotices(sharedId, getUserEmail() ?? '') : [] }
}
