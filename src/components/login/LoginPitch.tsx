import AppIcon from '../AppIcon'
import {
  loginFeatureClass,
  loginFeatureIconClass,
  loginFeaturesClass,
  loginFooterNoteClass,
  loginTrustBadgeClass
} from '../ui/loginStyles'

/** The sign-in pitch a first-time visitor sees; a returning user with an expired session does not. */
export function LoginFeatures() {
  return (
    <ul className={loginFeaturesClass} aria-label="ویژگی‌های اصلی">
      <li className={loginFeatureClass}>
        <span className={loginFeatureIconClass} aria-hidden="true">
          <AppIcon name="chart" size={16} />
        </span>
        داشبورد مالی با نمودار درآمد و هزینه
      </li>
      <li className={loginFeatureClass}>
        <span className={loginFeatureIconClass} aria-hidden="true">
          <AppIcon name="folder" size={16} />
        </span>
        همگام‌سازی خودکار بین دستگاه‌ها
      </li>
      <li className={loginFeatureClass}>
        <span className={loginFeatureIconClass} aria-hidden="true">
          <AppIcon name="wallet" size={16} />
        </span>
        اقساط، چک، طلب و صندوقچه در یک جا
      </li>
    </ul>
  )
}

export function LoginFooter() {
  return (
    <>
      <p className={loginFooterNoteClass}>
        شیت‌ها با فرمت «حسابداری · سال» ساخته می‌شوند و روی Drive همگام هستند
      </p>

      <div className={loginTrustBadgeClass}>
        <AppIcon name="check" size={14} />
        <span>داده‌ها فقط در Google Drive شما ذخیره می‌شوند</span>
      </div>
    </>
  )
}
