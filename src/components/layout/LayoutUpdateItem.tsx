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
 * «بررسی به‌روزرسانی» on both platforms; once a version is ready it becomes
 * «به‌روزرسانی به X» with the orange dot, also after «بعداً» on the banner.
 * An Android browser also gets the APK download right under it.
 */
export default function LayoutUpdateItem() {
  const update = useAppUpdateStore(state => state.update)

  const checking = useAppUpdateStore(state => state.checking)

  const check = useAppUpdateStore(state => state.check)

  const apply = useAppUpdateStore(state => state.apply)

  const preparing = useAppUpdateStore(state => state.preparing)

  const installBlocked = useAppUpdateStore(state => state.installBlocked)

  const label = preparing
    ? 'در حال پشتیبان…'
    : installBlocked
    ? 'باز کردن لینک نصب'
    : update
    ? `به‌روزرسانی به ${update.versionName || 'نسخه جدید'}`
    : checking
    ? 'در حال بررسی…'
    : 'بررسی به‌روزرسانی'

  const handleClick = async () => {
    if (update) {
      void apply()

      return
    }

    try {
      const latest = await check({ force: true })

      if (latest) {
        showSuccess(`نسخه ${latest.versionName || 'جدید'} آماده است`)

        return
      }

      showInfo('نسخهٔ نصب‌شده به‌روز است')
    } catch {
      showError('بررسی به‌روزرسانی ناموفق بود')
    }
  }

  return (
    <>
      <button
        type="button"
        className={appMenuItemClass(!!update)}
        onClick={() => void handleClick()}
        disabled={checking || preparing}
        aria-busy={checking || preparing}
      >
        <span className={appMenuItemIconClass(!!update)}>
          <AppIcon name={update ? 'import' : 'refresh'} size={20} />
        </span>
        <span className={appMenuItemLabelClass}>{label}</span>
        {update && <span className={appMenuUpdateDotClass} aria-hidden="true" />}
      </button>
      {!isNativePlatform() && isAndroidDevice() && <LayoutApkDownloadItem />}
    </>
  )
}
