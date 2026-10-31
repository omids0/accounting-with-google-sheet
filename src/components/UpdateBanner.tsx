import Button from './ui/Button'
import { nudgeLinkClass } from './ui/nudgeStyles'
import {
  updateBannerActionsClass,
  updateBannerClass,
  updateBannerNoteClass,
  updateBannerTextClass
} from './ui/updateStyles'
import { useAppUpdateCheck } from '../hooks/useAppUpdateCheck'
import { useAppUpdateStore } from '../stores/appUpdateStore'

/**
 * «نسخه X آماده است» for the web build (already downloaded, applies on tap) and the
 * APK (downloads the installer on tap). Nothing reloads or installs by itself.
 */
export default function UpdateBanner() {
  const { update, apply, dismiss } = useAppUpdateCheck()
  const preparing = useAppUpdateStore(state => state.preparing)

  if (!update) return null

  const title = update.versionName ? `نسخه ${update.versionName} آماده است` : 'نسخه جدید آماده است'

  const note = update.apkUrl
    ? 'هر وقت خواستی دانلود و نصبش کن.'
    : 'دانلود شده؛ هر وقت خواستی به‌روز کن.'

  return (
    <div className={updateBannerClass} role="status" aria-live="polite" data-update-banner>
      <p className={updateBannerTextClass}>
        <b>{title}</b>
        <span className={updateBannerNoteClass}>{note}</span>
      </p>
      <div className={updateBannerActionsClass}>
        <Button
          variant="primary"
          size="sm"
          type="button"
          disabled={preparing}
          aria-busy={preparing}
          onClick={() => void apply()}
        >
          {preparing ? 'در حال گرفتن پشتیبان…' : 'به‌روزرسانی'}
        </Button>
        <button type="button" className={nudgeLinkClass} disabled={preparing} onClick={dismiss}>
          بعداً
        </button>
      </div>
    </div>
  )
}
