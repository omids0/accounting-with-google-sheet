import { useMemo } from 'react'

import { useSyncStatus } from '../hooks/useSyncStatus'
import { syncStatusBadgeClass, syncStatusDotClass, syncStatusLabelClass } from './ui/layoutStyles'

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return 'هنوز همگام نشده'

  const diffMs = Date.now() - timestamp

  const diffSec = Math.floor(diffMs / 1000)

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

type SyncStatus = 'online' | 'syncing' | 'offline' | 'error'

export default function SyncStatusBadge() {
  const { connection, syncState, lastSyncedAt, pendingWrites, lastError } = useSyncStatus()

  const label = useMemo(() => {
    if (connection === 'offline') {
      return pendingWrites > 0 ? `آفلاین (${pendingWrites} در انتظار)` : 'آفلاین'
    }
    if (syncState === 'syncing') return 'در حال بروزرسانی…'
    if (pendingWrites > 0) return `در حال ذخیره (${pendingWrites})`
    if (lastError) return 'خطا در همگام‌سازی'

    return formatRelativeTime(lastSyncedAt)
  }, [connection, syncState, lastSyncedAt, pendingWrites, lastError])

  const status: SyncStatus =
    connection === 'offline'
      ? 'offline'
      : syncState === 'syncing' || pendingWrites > 0
      ? 'syncing'
      : lastError
      ? 'error'
      : 'online'

  return (
    <div
      className={syncStatusBadgeClass}
      title={lastError ?? `آخرین بروزرسانی: ${formatRelativeTime(lastSyncedAt)}`}
    >
      <span className={syncStatusDotClass(status)} aria-hidden="true" />
      <span className={syncStatusLabelClass}>{label}</span>
    </div>
  )
}
