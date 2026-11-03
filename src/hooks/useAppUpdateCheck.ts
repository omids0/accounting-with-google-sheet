import { useEffect, useState } from 'react'

import { useUserBusy } from './useUserBusy'
import type { AvailableUpdate } from '../services/appUpdate'
import { isNativePlatform } from '../services/googleAuthNative'
import { selectBannerUpdate, useAppUpdateStore } from '../stores/appUpdateStore'

/** Keeps the check off the critical path while the app is still loading sheet data. */
const FIRST_CHECK_DELAY_MS = 8_000

/**
 * The update banner's state. The APK checks its release manifest here; the web build
 * checks on its own schedule (`webUpdate.ts`). The banner never appears mid-task (an
 * open modal or sheet, unsaved input): until then only the menu dot shows. Once on
 * screen it stays, so opening a picker does not shift the page under it.
 */
export function useAppUpdateCheck(): {
  update: AvailableUpdate | null
  apply: () => Promise<void>
  dismiss: () => void
} {
  const update = useAppUpdateStore(selectBannerUpdate)
  const apply = useAppUpdateStore(state => state.apply)
  const dismiss = useAppUpdateStore(state => state.dismiss)
  const busy = useUserBusy()
  const [shownKey, setShownKey] = useState<string | null>(null)

  const readyKey = update && !busy ? update.key : null

  useEffect(() => {
    if (readyKey) setShownKey(readyKey)
  }, [readyKey])

  useEffect(() => {
    if (!isNativePlatform()) return

    const { check } = useAppUpdateStore.getState()

    const firstCheck = window.setTimeout(() => void check(), FIRST_CHECK_DELAY_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void check()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(firstCheck)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return { update: update && shownKey === update.key ? update : null, apply, dismiss }
}
