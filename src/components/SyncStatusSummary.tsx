import { formatRelativeTime } from './syncBadgeState'
import { confirmDeleteMessageClass } from './ui/featureCardStyles'

type SyncStatusSummaryProps = {
  pendingWrites: number
  failedWrites: number
  conflicts: number
  lastSyncedAt: number | null
  offline: boolean
}

/** The state in one place, so the dialog never opens without saying what it is about. */
export default function SyncStatusSummary({
  pendingWrites,
  failedWrites,
  conflicts,
  lastSyncedAt,
  offline
}: SyncStatusSummaryProps) {
  const settled = !pendingWrites && !failedWrites && !conflicts

  return (
    <div role="status" aria-live="polite">
      <p className={confirmDeleteMessageClass}>
        {settled
          ? 'همهٔ تغییرها به شیت رسیده است.'
          : [
              pendingWrites > 0 && `${pendingWrites.toLocaleString('fa-IR')} تغییر در صف ارسال`,
              failedWrites > 0 && `${failedWrites.toLocaleString('fa-IR')} عملیات ناموفق`,
              conflicts > 0 && `${conflicts.toLocaleString('fa-IR')} تعارض`
            ]
              .filter(Boolean)
              .join(' · ')}
      </p>
      <p className={confirmDeleteMessageClass}>
        {offline ? 'اینترنت وصل نیست. ' : ''}
        آخرین همگام‌سازی موفق: {lastSyncedAt ? formatRelativeTime(lastSyncedAt) : 'هنوز انجام نشده'}
      </p>
    </div>
  )
}
