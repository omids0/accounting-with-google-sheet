import { getUserEmail, getUserPicture, isTokenValid } from '../../services/auth'
import AppIcon from '../AppIcon'
import LazyImage from '../LazyImage'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'
import { statusBadgeClass } from '../ui/displayStyles'
import {
  settingsGoogleAccountAvatarClass,
  settingsGoogleAccountBodyClass,
  settingsGoogleAccountEmailClass,
  settingsGoogleAccountRowClass
} from '../ui/settingsStyles'

type SettingsGoogleAccountCardProps = {
  onLogout: () => void
}

export default function SettingsGoogleAccountCard({ onLogout }: SettingsGoogleAccountCardProps) {
  const userPicture = getUserPicture()

  return (
    <Card>
      <CardTitle>حساب گوگل</CardTitle>
      <div className={settingsGoogleAccountRowClass}>
        {userPicture ? (
          <LazyImage src={userPicture} alt="" className={settingsGoogleAccountAvatarClass} />
        ) : null}
        <div className={settingsGoogleAccountBodyClass}>
          <p className={settingsGoogleAccountEmailClass}>{getUserEmail()}</p>
          <span className={statusBadgeClass(isTokenValid())}>
            {isTokenValid() ? (
              <>
                <AppIcon name="check" size={12} strokeWidth={2.5} />
                متصل
              </>
            ) : (
              <>
                <AppIcon name="x-mark" size={12} strokeWidth={2.5} />
                نیاز به ورود مجدد
              </>
            )}
          </span>
        </div>
      </div>
      <Button variant="danger" size="sm" onClick={onLogout} className="mt-3">
        خروج
      </Button>
    </Card>
  )
}
