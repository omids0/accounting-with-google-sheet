import { useEffect, useState } from 'react'

import { nudgeLinkClass } from './ui/nudgeStyles'
import {
  updateBannerActionsClass,
  updateBannerClass,
  updateBannerNoteClass,
  updateBannerTextClass
} from './ui/updateStyles'
import { useRefreshNotice, type RefreshNotice } from '../hooks/useRefreshNotice'

const MESSAGES: Record<Exclude<RefreshNotice, 'hidden'>, { title: string; note: string }> = {
  offline: {
    title: 'نشست تمدید نشد؛ آفلاین',
    note: 'اطلاعات ذخیره‌شده را می‌بینید. با وصل شدن اینترنت خودکار دوباره تلاش می‌شود.'
  },
  retrying: {
    title: 'نشست تمدید نشد',
    note: 'گوگل جواب نداد؛ اپ هر چند دقیقه دوباره تلاش می‌کند و اگر نشد، ورود دوباره را می‌خواهد.'
  }
}

/** Shown after several renewals in a row got no answer; the app keeps working on cached data. */
export default function SessionRenewNotice() {
  const notice = useRefreshNotice()
  // «بستن» hides it until the app is reloaded; a later stall does not bring it back.
  const [dismissed, setDismissed] = useState(false)
  // The live region exists before its text does: a status node that mounts already filled is
  // not announced by screen readers.
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const message = notice === 'hidden' || dismissed || !mounted ? null : MESSAGES[notice]

  return (
    <div role="status" aria-live="polite">
      {message ? (
        <div className={updateBannerClass} data-session-renew-notice>
          <p className={updateBannerTextClass}>
            <b>{message.title}</b>
            <span className={updateBannerNoteClass}>{message.note}</span>
          </p>
          <div className={updateBannerActionsClass}>
            <button type="button" className={nudgeLinkClass} onClick={() => setDismissed(true)}>
              بستن
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
