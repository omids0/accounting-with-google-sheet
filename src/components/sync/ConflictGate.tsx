import { lazy, Suspense, useEffect, useState } from 'react'

import { useSyncStatus } from '../../hooks/useSyncStatus'
import { useUserBusy } from '../../hooks/useUserBusy'
import { useConflictStore } from '../../stores/conflictStore'

// Only loads once a conflict exists, so the sheet's code stays out of the main chunk.
const LazyConflictSheet = lazy(() => import('./ConflictSheet'))

/** Mounted next to the update banner: shows «کدام بماند؟» once no form or sheet is open. */
export default function ConflictGate() {
  const { conflicts } = useSyncStatus()
  const busy = useUserBusy()
  const { dismissedAt, dismiss, reopen } = useConflictStore()
  const [showing, setShowing] = useState(false)
  const wanted = conflicts > 0 && conflicts > dismissedAt

  useEffect(() => {
    if (!conflicts && dismissedAt) reopen()
  }, [conflicts, dismissedAt, reopen])

  // Opened only while nothing else is open; once open, its own overlay keeps it busy.
  useEffect(() => {
    if (wanted && !busy) setShowing(true)
    if (!wanted) setShowing(false)
  }, [busy, wanted])

  if (!showing) return null

  return (
    <Suspense fallback={null}>
      <LazyConflictSheet
        onClose={() => {
          dismiss(conflicts)
          setShowing(false)
        }}
      />
    </Suspense>
  )
}
