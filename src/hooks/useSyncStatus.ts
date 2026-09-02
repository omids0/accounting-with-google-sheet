import { useEffect, useState } from 'react'

import {
  getSyncStatus,
  initSyncStatusListeners,
  subscribeSyncStatus,
  type SyncStatusSnapshot
} from '../services/syncStatus'

export function useSyncStatus(): SyncStatusSnapshot {
  const [status, setStatus] = useState(getSyncStatus)

  useEffect(() => {
    const removeListeners = initSyncStatusListeners()

    const unsubscribe = subscribeSyncStatus(() => setStatus(getSyncStatus()))

    return () => {
      removeListeners()
      unsubscribe()
    }
  }, [])

  return status
}
