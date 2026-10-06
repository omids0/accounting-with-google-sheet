import { useMemo, useState } from 'react'

import ConfirmActionModal from './ConfirmActionModal'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { dismissFailedWrites, getActiveSpreadsheetId } from '../services/sheetSync'
import { getFailedOutboxEntries } from '../services/syncOutbox'
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
  const { connection, syncState, lastSyncedAt, pendingWrites, failedWrites, lastError } =
    useSyncStatus()

  const [detailsOpen, setDetailsOpen] = useState(false)

  const label = useMemo(() => {
    if (connection === 'offline') {
      return pendingWrites > 0 ? `آفلاین (${pendingWrites} در انتظار)` : 'آفلاین'
    }
    if (syncState === 'syncing') return 'در حال بروزرسانی…'
    if (pendingWrites > 0) return `در حال ذخیره (${pendingWrites})`
    if (failedWrites > 0) return `${failedWrites} تغییر اعمال نشد`
    if (lastError) return 'خطا در همگام‌سازی'

    return formatRelativeTime(lastSyncedAt)
  }, [connection, syncState, lastSyncedAt, pendingWrites, failedWrites, lastError])

  const status: SyncStatus =
    connection === 'offline'
      ? 'offline'
      : syncState === 'syncing' || pendingWrites > 0
      ? 'syncing'
      : lastError || failedWrites > 0
      ? 'error'
      : 'online'

  const badgeContent = (
    <>
      <span className={syncStatusDotClass(status)} aria-hidden="true" />
      <span className={syncStatusLabelClass}>{label}</span>
    </>
  )

  if (failedWrites > 0 && label.endsWith('اعمال نشد')) {
    const spreadsheetId = getActiveSpreadsheetId()

    const details = spreadsheetId
      ? getFailedOutboxEntries(spreadsheetId)
          .map(entry => `• ${entry.operation.sheetName}: ${entry.lastError ?? 'خطای نامشخص'}`)
          .join('\n')
      : ''

    return (
      <>
        <button
          type="button"
          data-sync-badge
          className={syncStatusBadgeClass}
          onClick={() => setDetailsOpen(true)}
        >
          {badgeContent}
        </button>
        <ConfirmActionModal
          open={detailsOpen}
          title="تغییرهایی که در شیت ثبت نشد"
          message={`این تغییرها به شیت نرسید، معمولاً چون همان رکورد روی دستگاه دیگری حذف یا عوض شده بود. داده‌های شیت دست نخورده‌اند؛ اگر لازم است، تغییر را دوباره انجام دهید.\n\n${details}`}
          confirmLabel="متوجه شدم"
          cancelLabel="بستن"
          onClose={() => setDetailsOpen(false)}
          onConfirm={() => {
            if (spreadsheetId) dismissFailedWrites(spreadsheetId)
            setDetailsOpen(false)
          }}
        />
      </>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-sync-badge
      className={syncStatusBadgeClass}
      title={lastError ?? `آخرین بروزرسانی: ${formatRelativeTime(lastSyncedAt)}`}
    >
      {badgeContent}
    </div>
  )
}
