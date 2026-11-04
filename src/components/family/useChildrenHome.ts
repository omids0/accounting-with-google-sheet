import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import { forgetChildResultMessage } from './familyCopy'
import {
  lostChildren,
  probeChildAccess,
  subscribeChildAccessLost
} from '../../services/childAccessLost'
import { forgetChild } from '../../services/childForget'
import { listChildren, type ChildRecord } from '../../services/childrenRegistry'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

/**
 * The state of «فرزندان من»: the children this device follows, which of them Google no longer
 * opens (checked with one metadata read each when the page opens, then kept in step by the shared
 * access-lost flags), and «حذف از فهرست» with the outcome told in words.
 */
export function useChildrenHome() {
  const [children, setChildren] = useState<ChildRecord[]>(listChildren)
  const [forgetting, setForgetting] = useState(false)

  // A string snapshot: `lostChildren()` builds a new array on every call.
  const lostKey = useSyncExternalStore(subscribeChildAccessLost, () =>
    lostChildren()
      .map(child => child.id)
      .join(',')
  )

  const reload = useCallback(() => setChildren(listChildren()), [])

  const ids = children.map(child => child.id).join(',')

  useEffect(() => {
    for (const id of ids.split(',').filter(Boolean)) void probeChildAccess(id)
  }, [ids])

  const forget = async (child: ChildRecord): Promise<void> => {
    setForgetting(true)
    try {
      const message = forgetChildResultMessage(await forgetChild(child.id))

      if (message.kind === 'success') showSuccess(message.text)
      else showError(message.text)
      reload()
    } catch (err) {
      showError(toUserMessage(err, 'حذف از فهرست ناموفق بود'))
    } finally {
      setForgetting(false)
    }
  }

  return { children, lost: new Set(lostKey.split(',').filter(Boolean)), reload, forget, forgetting }
}
