import { useCallback, useEffect, useRef, useState } from 'react'

import { rememberParentCount } from '../../hooks/useActiveParentCount'
import { getUserName } from '../../services/auth'
import { useDataRevision } from '../../services/dataRevision'
import {
  grantParentAccess,
  listParents,
  localParents,
  PARENT_GRANT_MESSAGES,
  type ParentAccess
} from '../../services/parentAccess'
import { getSettings } from '../../services/settings'
import { APP_URL } from '../../utils/appLinks'
import { normalizeEmail } from '../../utils/email'
import { getTodayIso } from '../../utils/jalaliDate'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

const GRANTED_MESSAGE = 'اجازه داده شد؛ والد حالا حساب شما را می‌بیند'

/**
 * The state of the child's «والدین من»: the parents (the marker rows at once, then checked against
 * Google Drive), and «اجازه دسترسی» with its four answers (`PARENT_GRANT_MESSAGES`) as the line under
 * the field (real failures are toasts). There is no way to remove a parent here, by design (owner decision).
 */
export function useParentsHome(prefilledEmail: string) {
  const revision = useDataRevision()
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''

  const [parents, setParents] = useState<ParentAccess[]>(() =>
    localParents(spreadsheetId).map(parent => ({ ...parent, status: 'unverified' as const }))
  )
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState(prefilledEmail)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [granting, setGranting] = useState(false)
  // State lags a click: a triple click would otherwise send three Drive shares (and three e-mails).
  const grantInFlight = useRef(false)

  const reload = useCallback(async () => {
    setChecking(true)
    try {
      const list = await listParents(spreadsheetId)

      setParents(list)
      rememberParentCount(spreadsheetId, list)
    } finally {
      setChecking(false)
    }
  }, [spreadsheetId])

  useEffect(() => {
    void reload().catch(() => undefined)
  }, [reload, revision])

  const grant = async () => {
    if (grantInFlight.current) return
    grantInFlight.current = true
    setError(null)
    setGranting(true)
    try {
      const result = await grantParentAccess(email, {
        childName: getUserName() ?? undefined,
        appUrl: APP_URL || undefined
      })

      if (result !== 'granted') {
        // A validation answer shows under the field only; a toast too would say it twice.
        setError(PARENT_GRANT_MESSAGES[result])

        return
      }
      showSuccess(GRANTED_MESSAGE)
      setEmail('')
      setConsent(false)
      await reload()
      // The new marker row may not be in the local copy yet: show the parent right away.
      setParents(list => {
        const added = normalizeEmail(email)

        return list.some(parent => parent.email === added)
          ? list
          : [...list, { email: added, since: getTodayIso(), status: 'active' }]
      })
    } catch (err) {
      const message = toUserMessage(err, 'دادن دسترسی ناموفق بود')

      setError(message)
      showError(message)
    } finally {
      grantInFlight.current = false
      setGranting(false)
    }
  }

  return {
    parents,
    checking,
    email,
    setEmail: (value: string) => {
      setEmail(value)
      setError(null)
    },
    consent,
    setConsent,
    error,
    granting,
    canGrant: consent && email.trim() !== '' && !granting,
    grant
  }
}
