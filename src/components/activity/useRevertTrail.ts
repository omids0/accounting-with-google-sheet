import { useCallback, useMemo, useRef, useState } from 'react'

import type { RevertState } from './RevertTrailModal'
import { trailLines } from './trailText'
import type { TrailView } from './trailView'
import { useAccountNames } from './useAccountNames'
import { useSharedCan } from '../../hooks/useSharedCan'
import type { ActivityEntry } from '../../services/activityLog'
import { revertedLogIds, revertOffered } from '../../services/activityTrailRevert'
import { getUserEmail } from '../../services/auth'
import { getSettings } from '../../services/settings'
import { showError } from '../../utils/toast'

/**
 * «بازگردانی» of the activity page: the preview question, then the revert. The revert code is
 * loaded only when a button is tapped. A tap while one is running does nothing.
 */
export function useRevertTrail(entries: ActivityEntry[], onReverted: () => void) {
  const mayRecord = useSharedCan('record')
  const mayEditOthers = useSharedCan('editOthers')
  const accountName = useAccountNames()
  const [state, setState] = useState<RevertState | null>(null)
  const [confirming, setConfirming] = useState(false)
  const target = useRef<ActivityEntry | null>(null)

  const reverted = useMemo(() => revertedLogIds(entries), [entries])

  const view = useMemo<TrailView>(() => {
    const forms = getSettings()?.forms ?? []
    const me = (getUserEmail() ?? '').toLowerCase()
    const may = (permission: 'record' | 'editOthers') =>
      permission === 'record' ? mayRecord : mayEditOthers

    return {
      lines: entry => trailLines(entry, forms, accountName),
      offered: entry => revertOffered(entry, { reverted, me, may }),
      reverted: entry => reverted.has(entry.id),
      revert: entry => {
        const spreadsheetId = getSettings()?.spreadsheetId

        if (!spreadsheetId) return
        target.current = entry
        setState({ preview: null })
        void import('../records/recordRevert')
          .then(({ planRecordRevert }) => planRecordRevert(spreadsheetId, entry))
          .then(preview => {
            if (target.current === entry) setState({ preview })
          })
          .catch(() => setState({ preview: { ok: false, reason: 'بررسی تراکنش انجام نشد.' } }))
      }
    }
  }, [accountName, mayEditOthers, mayRecord, reverted])

  const close = useCallback(() => {
    if (confirming) return
    target.current = null
    setState(null)
  }, [confirming])

  const confirm = useCallback(async () => {
    const entry = target.current
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!entry || !spreadsheetId || confirming) return
    setConfirming(true)
    try {
      const { runRecordRevert } = await import('../records/recordRevert')
      const result = await runRecordRevert(spreadsheetId, entry)

      if (result.status === 'done') {
        target.current = null
        setState(null)
        onReverted()
      } else if (result.status === 'refused') {
        setState({ preview: { ok: false, reason: result.reason } })
      } else if (result.status === 'failed') {
        showError('بازگردانی انجام نشد؛ تراکنش را در «تراکنش‌ها» بررسی کن.')
      }
    } finally {
      setConfirming(false)
    }
  }, [confirming, onReverted])

  return { view, state, confirming, close, confirm, accountName }
}
