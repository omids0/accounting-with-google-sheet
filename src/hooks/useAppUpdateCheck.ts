import { useEffect } from 'react'

import type { AvailableUpdate } from '../services/appUpdate'
import { selectBannerUpdate, useAppUpdateStore } from '../stores/appUpdateStore'

/** Keeps the check off the critical path while the app is still loading sheet data. */
const FIRST_CHECK_DELAY_MS = 8_000

export function useAppUpdateCheck(): {
  update: AvailableUpdate | null
  dismiss: () => void
} {
  const update = useAppUpdateStore(selectBannerUpdate)

  const dismiss = useAppUpdateStore(state => state.dismiss)

  useEffect(() => {
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

  return { update, dismiss }
}
