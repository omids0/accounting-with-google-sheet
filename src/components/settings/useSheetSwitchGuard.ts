import { useState } from 'react'

import { flushOutbox } from '../../services/sheetSync'
import { getOutboxCount } from '../../services/syncOutbox'
import { showError } from '../../utils/toast'

type PendingSwitch = { run: () => Promise<void>; count: number }

/**
 * Leaving a sheet that still has unsent changes asks first: sync them, or
 * switch and leave them queued for the next time that sheet is opened.
 */
export function useSheetSwitchGuard(currentId: string) {
  const [pending, setPending] = useState<PendingSwitch | null>(null)

  const [flushing, setFlushing] = useState(false)

  const guard = async (run: () => Promise<void>) => {
    const count = currentId ? getOutboxCount(currentId) : 0

    if (count > 0) setPending({ run, count })
    else await run()
  }

  const onSyncFirst = async () => {
    if (!pending) return
    setFlushing(true)
    try {
      if (!(await flushOutbox(currentId))) {
        showError(
          'همهٔ تغییرها به شیت فعلی نرسید؛ اتصال را بررسی کنید یا بدون همگام‌سازی جابه‌جا شوید.'
        )

        return
      }
      setPending(null)
      await pending.run()
    } finally {
      setFlushing(false)
    }
  }

  const onSwitchAnyway = async () => {
    if (!pending) return
    setPending(null)
    await pending.run()
  }

  return {
    guard,
    modalProps: {
      open: Boolean(pending),
      count: pending?.count ?? 0,
      flushing,
      onClose: () => setPending(null),
      onSyncFirst: () => void onSyncFirst(),
      onSwitchAnyway: () => void onSwitchAnyway()
    }
  }
}

export type SheetSwitchGuardModalProps = ReturnType<typeof useSheetSwitchGuard>['modalProps']
