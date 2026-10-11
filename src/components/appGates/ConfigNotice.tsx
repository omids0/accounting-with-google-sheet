import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import Alert from '../ui/Alert'
import { animateInClass } from '../ui/layoutStyles'
import {
  loginCardClass,
  loginLogoClass,
  loginLogoIconClass,
  loginLogoSubtitleClass,
  loginLogoTitleClass,
  loginPageClass
} from '../ui/loginStyles'

/** Shown to developers when the build has no Google OAuth client id. */
export default function ConfigNotice() {
  return (
    <div className={loginPageClass}>
      <div className={cn(loginCardClass, animateInClass)}>
        <div className={loginLogoClass}>
          <span className={loginLogoIconClass}>
            <AppIcon name="warning" />
          </span>
          <h1 className={loginLogoTitleClass}>تنظیمات Google OAuth</h1>
          <p className={loginLogoSubtitleClass}>
            <code dir="ltr">VITE_GOOGLE_CLIENT_ID</code> در فایل <code dir="ltr">.env</code> تنظیم
            نشده.
          </p>
        </div>
        <Alert variant="info" dir="ltr" style={{ textAlign: 'left', fontSize: '0.75rem' }}>
          VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
        </Alert>
      </div>
    </div>
  )
}
