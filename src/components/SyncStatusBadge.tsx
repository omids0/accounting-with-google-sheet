import { useState } from 'react'

import { formatRelativeTime, getSyncBadgeState } from './syncBadgeState'
import SyncDetailsModal from './SyncDetailsModal'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { getActiveSpreadsheetId } from '../services/sheetSync'
import { syncStatusBadgeClass, syncStatusDotClass, syncStatusLabelClass } from './ui/layoutStyles'

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

  // Stays mounted while open so retrying the last entry does not yank the modal away.
  if (showDetails || detailsOpen) {
    return (
      <>
        <button
          type="button"
          data-sync-badge
          className={syncStatusBadgeClass}
          aria-label={cause ? `${label}: ${cause}` : label}
          aria-haspopup="dialog"
          onClick={() => setDetailsOpen(true)}
        >
          {badgeContent}
        </button>
        <SyncDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          spreadsheetId={getActiveSpreadsheetId()}
          cause={cause}
          pendingWrites={status.pendingWrites}
          failedWrites={status.failedWrites}
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
      title={`آخرین بروزرسانی: ${formatRelativeTime(status.lastSyncedAt)}`}
    >
      {badgeContent}
    </div>
  )
}
