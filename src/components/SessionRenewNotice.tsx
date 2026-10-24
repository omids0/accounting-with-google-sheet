import { updateBannerClass, updateBannerTextClass } from './ui/updateStyles'
import { useRefreshNotice, type RefreshNotice } from '../hooks/useRefreshNotice'

const MESSAGES: Record<Exclude<RefreshNotice, 'hidden'>, { title: string; note: string }> = {
  offline: {
    title: 'نشست تمدید نشد؛ آفلاین',
    note: 'اطلاعات ذخیره‌شده را می‌بینی. با وصل شدن اینترنت خودکار دوباره تلاش می‌شود.'
  },
  retrying: {
    title: 'نشست تمدید نشد',
    note: 'گوگل جواب نداد؛ اپ هر چند دقیقه دوباره تلاش می‌کند و اگر نشد، ورود دوباره را می‌خواهد.'
  }
}

/** Shown after several renewals in a row got no answer; the app keeps working on cached data. */
export default function SessionRenewNotice() {
  const notice = useRefreshNotice()

  if (notice === 'hidden') return null

  const { title, note } = MESSAGES[notice]

  return (
    <div className={updateBannerClass} role="status" aria-live="polite" data-session-renew-notice>
      <p className={updateBannerTextClass}>
        <b>{title}</b>
        <span className="text-muted">{note}</span>
      </p>
    </div>
  )
}
