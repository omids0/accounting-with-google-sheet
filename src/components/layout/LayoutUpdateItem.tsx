import LayoutApkDownloadItem from './LayoutApkDownloadItem'
import { isNativePlatform } from '../../services/googleAuthNative'
import { useAppUpdateStore } from '../../stores/appUpdateStore'
import { isAndroidDevice } from '../../utils/platform'
import { showError, showInfo, showSuccess } from '../../utils/toast'
import AppIcon from '../AppIcon'
import {
  appMenuItemClass,
  appMenuItemIconClass,
  appMenuItemLabelClass,
  appMenuUpdateDotClass
} from '../ui/layoutStyles'

/**
 * Only the APK installs updates by hand; the web build refreshes itself.
 * An Android browser gets the APK download in the same slot instead.
 */
export default function LayoutUpdateItem() {
  const update = useAppUpdateStore(state => state.update)

  const checking = useAppUpdateStore(state => state.checking)

  const check = useAppUpdateStore(state => state.check)

  if (!isNativePlatform()) return isAndroidDevice() ? <LayoutApkDownloadItem /> : null

  const label = update
    ? `نسخهٔ ${update.versionName} آماده نصب است`
    : checking
    ? 'در حال بررسی…'
    : 'بررسی به‌روزرسانی'

  const handleClick = async () => {
    if (update) {
      window.open(update.apkUrl, '_blank')

      return
    }

    try {
      const latest = await check({ force: true })

      if (latest) {
        showSuccess(`نسخهٔ ${latest.versionName} موجود است`)

        return
      }

      showInfo('نسخهٔ نصب‌شده به‌روز است')
    } catch {
      showError('بررسی به‌روزرسانی ناموفق بود')
    }
  }

  return (
    <button
      type="button"
      className={appMenuItemClass(!!update)}
      onClick={() => void handleClick()}
      disabled={checking}
      aria-busy={checking}
    >
      <span className={appMenuItemIconClass(!!update)}>
        <AppIcon name={update ? 'import' : 'refresh'} size={20} strokeWidth={1.75} />
      </span>
      <span className={appMenuItemLabelClass}>{label}</span>
      {update && <span className={appMenuUpdateDotClass} aria-hidden="true" />}
    </button>
  )
}
