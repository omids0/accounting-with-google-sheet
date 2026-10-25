import { useCallback, useEffect, useState } from 'react'

import { useOnlineRetryKey } from '../../hooks/useOnlineRetryKey'
import {
  fetchInviteInfo,
  isInviteBackendConfigured,
  type InviteInfo
} from '../../services/inviteApi'

export type InviteInfoState =
  /** This build has no worker, so there is nothing to count. The plain link still works. */
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; info: InviteInfo }

/** The person's invite code and count. Retries by itself when the browser comes back online. */
export function useInviteInfo() {
  const onlineKey = useOnlineRetryKey()

  const [attempt, setAttempt] = useState(0)

  const [state, setState] = useState<InviteInfoState>(
    isInviteBackendConfigured() ? { status: 'loading' } : { status: 'unavailable' }
  )

  useEffect(() => {
    if (!isInviteBackendConfigured()) return

    let cancelled = false

    setState({ status: 'loading' })
    fetchInviteInfo()
      .then(info => {
        if (!cancelled) setState({ status: 'ready', info })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [onlineKey, attempt])

  const retry = useCallback(() => setAttempt(current => current + 1), [])

  return { state, retry }
}
