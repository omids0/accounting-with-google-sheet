import { getSyncStatus, subscribeSyncStatus } from './syncStatus'

/** Give up for this open when no sync succeeds in time; the next open tries again. */
export const SESSION_SYNC_WAIT_MS = 3 * 60_000

/** When this page (launch) started: the line a "first sync of this launch" must cross. */
export function sessionStart(): number {
  return typeof performance !== 'undefined' ? performance.timeOrigin : Date.now()
}

/** Resolves true once a sync has succeeded since `since` (false on timeout). */
export function waitForSessionSync(
  since = sessionStart(),
  timeoutMs = SESSION_SYNC_WAIT_MS
): Promise<boolean> {
  const synced = () => {
    const { lastSyncedAt, syncState } = getSyncStatus()

    return lastSyncedAt != null && lastSyncedAt >= since && syncState !== 'syncing'
  }

  if (synced()) return Promise.resolve(true)

  return new Promise(resolve => {
    const finish = (value: boolean) => {
      clearTimeout(timer)
      unsubscribe()
      resolve(value)
    }
    const timer = setTimeout(() => finish(false), timeoutMs)
    const unsubscribe = subscribeSyncStatus(() => {
      if (synced()) finish(true)
    })
  })
}
