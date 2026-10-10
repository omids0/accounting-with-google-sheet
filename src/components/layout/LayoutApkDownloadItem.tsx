import { APK_DOWNLOAD_URL } from '../../services/appUpdate'
import AppIcon from '../AppIcon'
import { appMenuItemClass, appMenuItemIconClass, appMenuItemLabelClass } from '../ui/layoutStyles'

/** Menu entry shown to Android visitors on the website, who can install the native app. */
export default function LayoutApkDownloadItem() {
  return (
    <button
      type="button"
      className={appMenuItemClass(false)}
      onClick={() => window.open(APK_DOWNLOAD_URL, '_blank')}
    >
      <span className={appMenuItemIconClass(false)}>
        <AppIcon name="import" size={20} strokeWidth={1.75} />
      </span>
      <span className={appMenuItemLabelClass}>دانلود اپ اندروید</span>
    </button>
  )
}
