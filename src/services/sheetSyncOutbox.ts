import { invalidateInstallmentsCache } from './installments'
import { isQuotaExceededError } from './sheets'
import {
  addOutboxEntry,
  getOutboxCount,
  getOutboxEntries,
  hasPendingOutbox,
  markOutboxEntryFailed,
  removeOutboxEntry
} from './syncOutbox'
import type { OutboxOperation } from './syncOutbox'
import { setPendingWrites, setSyncState } from './syncStatus'

const QUOTA_BACKOFF_MS = 90_000

let quotaBlockedUntil = 0

let flushInFlight: Promise<boolean> | null = null

export function markQuotaExceeded(): void {
  quotaBlockedUntil = Date.now() + QUOTA_BACKOFF_MS
  setSyncState(
    'error',
    'محدودیت درخواست Google Sheets پر شده. حدود یک دقیقه صبر کنید و دوباره تلاش کنید.'
  )
}

export function isQuotaBlocked(): boolean {
  return Date.now() < quotaBlockedUntil
}

function refreshPendingCount(spreadsheetId: string): void {
  setPendingWrites(getOutboxCount(spreadsheetId))
}

export function queueOutboxWrite(spreadsheetId: string, operation: OutboxOperation): void {
  addOutboxEntry(spreadsheetId, operation)
  refreshPendingCount(spreadsheetId)
  void flushOutbox(spreadsheetId)
}

export async function flushOutbox(spreadsheetId: string): Promise<boolean> {
  if (!spreadsheetId) return true
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  if (isQuotaBlocked()) return false

  if (flushInFlight) {
    return flushInFlight
  }

  const task = (async () => {
    const { executeOutboxOperation } = await import('./sheets')

    const entries = getOutboxEntries(spreadsheetId)

    if (!entries.length) {
      refreshPendingCount(spreadsheetId)

      return true
    }

    setSyncState('syncing')

    for (const entry of entries) {
      if (isQuotaBlocked()) return false
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false

      try {
        await executeOutboxOperation(spreadsheetId, entry.operation)
        removeOutboxEntry(spreadsheetId, entry.id)
        refreshPendingCount(spreadsheetId)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'خطا در همگام‌سازی'

        markOutboxEntryFailed(spreadsheetId, entry.id, message)

        if (isQuotaExceededError(err)) {
          markQuotaExceeded()

          return false
        }

        setSyncState('error', message)
        refreshPendingCount(spreadsheetId)

        return false
      }
    }

    refreshPendingCount(spreadsheetId)
    if (!hasPendingOutbox(spreadsheetId)) {
      setSyncState('idle')
    }

    return true
  })()

  flushInFlight = task.finally(() => {
    flushInFlight = null
  })

  return flushInFlight
}

export function invalidateDerivedCaches(spreadsheetId: string): void {
  invalidateInstallmentsCache(spreadsheetId)
}
