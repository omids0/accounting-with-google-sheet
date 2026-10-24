import { useSyncExternalStore } from 'react'

import { isRefreshStalled, subscribeRefreshStatus } from '../services/refreshStatus'

export type RefreshNotice = 'hidden' | 'offline' | 'retrying'

function subscribe(listener: () => void): () => void {
  const unsubscribe = subscribeRefreshStatus(listener)

  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)

  return () => {
    unsubscribe()
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

function getSnapshot(): RefreshNotice {
  if (!isRefreshStalled()) return 'hidden'

  return navigator.onLine === false ? 'offline' : 'retrying'
}

/** What to tell the user once token renewal has failed several times without an answer. */
export function useRefreshNotice(): RefreshNotice {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'hidden')
}
