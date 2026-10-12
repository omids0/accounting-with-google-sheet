import type { SyncStatusSnapshot } from '../services/syncStatus'
import { toUserMessage } from '../utils/userMessage'

export type SyncBadgeTone = 'online' | 'syncing' | 'offline' | 'error'

export interface SyncBadgeState {
  label: string
  tone: SyncBadgeTone
  /** Persian reason the sync is stuck, when there is one. */
  cause: string | null
  /** The badge opens the details modal (a tap works on touch, a tooltip does not). */
  showDetails: boolean
}

export function formatRelativeTime(timestamp: number | null, now = Date.now()): string {
  if (!timestamp) return 'هنوز همگام نشده'

  const diffSec = Math.floor((now - timestamp) / 1000)

  if (diffSec < 10) return 'همین الان'
  if (diffSec < 60) return `${diffSec} ثانیه پیش`

  const diffMin = Math.floor(diffSec / 60)

  if (diffMin < 60) return `${diffMin} دقیقه پیش`

  const diffHour = Math.floor(diffMin / 60)

  if (diffHour < 24) return `${diffHour} ساعت پیش`

  return new Date(timestamp).toLocaleString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * An error outranks pending and syncing: a blocked queue used to read
 * «در حال ذخیره» forever while nothing reached the sheet.
 */
export function getSyncBadgeState(status: SyncStatusSnapshot, now = Date.now()): SyncBadgeState {
  const { connection, syncState, lastSyncedAt, pendingWrites, failedWrites, lastError } = status

  if (connection === 'offline') {
    return {
      label: pendingWrites > 0 ? `آفلاین (${pendingWrites} در انتظار)` : 'آفلاین',
      tone: 'offline',
      cause: null,
      showDetails: failedWrites > 0
    }
  }

  if (lastError || failedWrites > 0) {
    const label =
      lastError && pendingWrites > 0
        ? `ذخیره متوقف شد (${pendingWrites} در انتظار)`
        : failedWrites > 0
        ? `${failedWrites} تغییر اعمال نشد`
        : 'خطا در همگام‌سازی'

    return {
      label,
      tone: 'error',
      cause: lastError ? toUserMessage(lastError, 'خطا در همگام‌سازی') : null,
      showDetails: true
    }
  }

  const idle = { cause: null, showDetails: false }

  if (syncState === 'syncing') return { ...idle, label: 'در حال بروزرسانی…', tone: 'syncing' }
  if (pendingWrites > 0)
    return { ...idle, label: `در حال ذخیره (${pendingWrites})`, tone: 'syncing' }

  return { ...idle, label: formatRelativeTime(lastSyncedAt, now), tone: 'online' }
}
