import { useCallback, useEffect, useState } from 'react'

import {
  checkForUpdate,
  dismissUpdate,
  isUpdateDismissed,
  type AvailableUpdate
} from '../services/appUpdate'

const RECHECK_THROTTLE_MS = 30 * 60_000

/** Keeps the check off the critical path while the app is still loading sheet data. */
const FIRST_CHECK_DELAY_MS = 8_000

export function useAppUpdateCheck(): {
  update: AvailableUpdate | null
  dismiss: () => void
} {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)

  useEffect(() => {
    let cancelled = false

    let lastCheckedAt = 0

    const run = async () => {
      lastCheckedAt = Date.now()

      const latest = await checkForUpdate()

      if (cancelled) return
      setUpdate(latest && !isUpdateDismissed(latest.versionCode) ? latest : null)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastCheckedAt < RECHECK_THROTTLE_MS) return
      void run()
    }

    const firstCheck = window.setTimeout(() => void run(), FIRST_CHECK_DELAY_MS)

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearTimeout(firstCheck)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const dismiss = useCallback(() => {
    setUpdate(current => {
      if (current) dismissUpdate(current.versionCode)

      return null
    })
  }, [])

  return { update, dismiss }
}
