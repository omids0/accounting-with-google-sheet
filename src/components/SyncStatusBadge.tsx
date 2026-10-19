import { lazy, Suspense, useState } from 'react'

import { formatRelativeTime, getSyncBadgeState } from './syncBadgeState'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { getActiveSpreadsheetId } from '../services/sheetSync'
import { syncStatusBadgeClass, syncStatusDotClass, syncStatusLabelClass } from './ui/layoutStyles'

// Mounted only after a sync problem or a tap, so its code stays out of the main chunk.
const LazySyncDetailsModal = lazy(() => import('./SyncDetailsModal'))

export default function SyncStatusBadge() {
  const status = useSyncStatus()

  const [detailsOpen, setDetailsOpen] = useState(false)

  const { label, tone, cause, showDetails } = getSyncBadgeState(status)

  const badgeContent = (
    <>
      <span className={syncStatusDotClass(tone)} aria-hidden="true" />
      <span className={syncStatusLabelClass}>{label}</span>
    </>
  )

  // The badge is always tappable: while a sync hangs it still shows «در حال ذخیره» with no
  // error, and the report behind it is what shows where it stopped. The modal (and its
  // chunk) is only mounted after a problem or a tap, and stays mounted while open so
  // retrying the last entry does not yank it away.
  return (
    <>
      <button
        type="button"
        data-sync-badge
        className={syncStatusBadgeClass}
        aria-label={cause ? `${label}: ${cause}` : `${label}؛ جزئیات همگام‌سازی`}
        aria-haspopup="dialog"
        title={`آخرین بروزرسانی: ${formatRelativeTime(status.lastSyncedAt)}`}
        onClick={() => setDetailsOpen(true)}
      >
        {badgeContent}
      </button>
      {showDetails || detailsOpen ? (
        <Suspense fallback={null}>
          <LazySyncDetailsModal
            open={detailsOpen}
            onClose={() => setDetailsOpen(false)}
            spreadsheetId={getActiveSpreadsheetId()}
            cause={cause}
            pendingWrites={status.pendingWrites}
            conflicts={status.conflicts}
            failedWrites={status.failedWrites}
          />
        </Suspense>
      ) : null}
    </>
  )
}
