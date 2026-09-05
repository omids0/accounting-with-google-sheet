import { getUserEmail, getUserPicture, isTokenValid } from '../../services/auth'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'
import { statusBadgeClass } from '../ui/displayStyles'

type SettingsGoogleAccountCardProps = {
  onLogout: () => void
}

export default function SettingsGoogleAccountCard({ onLogout }: SettingsGoogleAccountCardProps) {
  return (
    <Card>
      <CardTitle>حساب گوگل</CardTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {getUserPicture() && (
          <img
            src={getUserPicture()!}
            alt=""
            style={{ width: 36, height: 36, borderRadius: '50%' }}
          />
        )}
        <div>
          <p style={{ fontSize: '0.85rem' }}>{getUserEmail()}</p>
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
      <Button variant="danger" size="sm" onClick={onLogout} style={{ marginTop: '0.75rem' }}>
        خروج
      </Button>
    </Card>
  )
}
