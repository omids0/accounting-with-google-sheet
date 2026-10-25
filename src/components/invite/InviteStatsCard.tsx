import { formatPersianNumber } from '../../utils/formatMoney'
import { Skeleton } from '../skeleton'
import type { InviteInfoState } from './useInviteInfo'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'
import { inviteCountClass, inviteStatsBodyClass, inviteTextClass } from '../ui/inviteStyles'

interface InviteStatsCardProps {
  state: InviteInfoState
  onRetry: () => void
}

/** «دعوت موفق» means the invited person signed in to the app with this person's link or code. */
export default function InviteStatsCard({ state, onRetry }: InviteStatsCardProps) {
  if (state.status === 'unavailable') return null

  return (
    <Card>
      <CardTitle>دعوت‌های موفق</CardTitle>
      {state.status === 'loading' && (
        <div className={inviteStatsBodyClass} aria-busy="true">
          <Skeleton width="40%" height={36} />
        </div>
      )}
      {state.status === 'error' && (
        <>
          <Alert variant="error">آمار دعوت دریافت نشد. اینترنت را بررسی کنید.</Alert>
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            تلاش دوباره
          </Button>
        </>
      )}
      {state.status === 'ready' && (
        <div className={inviteStatsBodyClass}>
          <p className={inviteCountClass}>{formatPersianNumber(state.info.count)} نفر</p>
          <p className={inviteTextClass}>
            {state.info.count === 0
              ? 'هنوز کسی با لینک یا کد شما وارد اپ نشده است.'
              : 'این تعداد با لینک یا کد شما برای اولین بار وارد اپ شده‌اند.'}
          </p>
        </div>
      )}
    </Card>
  )
}
