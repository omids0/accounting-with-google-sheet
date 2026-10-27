import InviteStatsCard from './InviteStatsCard'
import { useInviteInfo } from './useInviteInfo'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { APK_DOWNLOAD_URL } from '../../services/appUpdate'
import { isNativePlatform } from '../../services/googleAuthNative'
import { inviteLandingUrl, inviteMessage } from '../../services/inviteShare'
import { shareText } from '../../utils/shareText'
import { Skeleton } from '../skeleton'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'
import {
  inviteActionClass,
  inviteActionsClass,
  inviteLinkBoxClass,
  invitePageClass,
  inviteTextClass
} from '../ui/inviteStyles'

export default function InvitePage() {
  const { state, retry } = useInviteInfo()

  const { copy } = useCopyToClipboard()

  const code = state.status === 'ready' ? state.info.code : undefined

  const url = inviteLandingUrl(code)

  const waitingForCode = state.status === 'loading'

  // Loading and ready fill the same space (the code card is there from the start), so the
  // cards below do not jump when the numbers arrive.
  const showCodeCard = state.status === 'loading' || state.status === 'ready'

  return (
    <div className={invitePageClass}>
      <Card>
        <CardTitle>لینک دعوت شما</CardTitle>
        <p className={inviteTextClass}>
          این لینک را برای دوستانتان بفرستید. با باز کردن آن بدون ورود می‌توانند نسخهٔ وب یا اندروید
          را بگیرند و وارد شوند.
        </p>
        {url ? (
          <>
            {waitingForCode ? (
              <div className={inviteLinkBoxClass} aria-busy="true">
                <Skeleton width="100%" height={20} />
              </div>
            ) : (
              <p className={inviteLinkBoxClass}>{url}</p>
            )}
            <div className={inviteActionsClass}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={inviteActionClass}
                disabled={waitingForCode}
                onClick={() => void shareText(inviteMessage(url), 'دعوت به حساب کتاب')}
              >
                اشتراک‌گذاری
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={inviteActionClass}
                disabled={waitingForCode}
                onClick={() => void copy(url, 'لینک کپی شد')}
              >
                کپی لینک
              </Button>
              {!isNativePlatform() && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={inviteActionClass}
                  onClick={() => window.open(APK_DOWNLOAD_URL, '_blank')}
                >
                  دانلود اپ اندروید
                </Button>
              )}
            </div>
            {state.status === 'error' && (
              <p className={`${inviteTextClass} mt-3`}>
                کد دعوت دریافت نشد، پس این لینک بدون کد است و ورود دوستانتان شمرده نمی‌شود. با «تلاش
                دوباره» در کارت پایین، لینک کامل را بگیرید.
              </p>
            )}
          </>
        ) : (
          <Alert variant="info">آدرس این نسخهٔ اپ برای ساخت لینک دعوت تنظیم نشده است.</Alert>
        )}
      </Card>
      {showCodeCard && (
        <Card>
          <CardTitle>کد دعوت شما</CardTitle>
          <p className={inviteTextClass}>
            دوستی که اپ اندروید را نصب می‌کند، هنگام ورود می‌تواند این کد را وارد کند تا دعوتش برای
            شما شمرده شود.
          </p>
          {code ? (
            <p className={inviteLinkBoxClass}>{code}</p>
          ) : (
            <div className={inviteLinkBoxClass} aria-busy="true">
              <Skeleton width="50%" height={20} />
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={inviteActionClass}
            disabled={!code}
            onClick={() => code && void copy(code, 'کد دعوت کپی شد')}
          >
            کپی کد
          </Button>
        </Card>
      )}
      <InviteStatsCard state={state} onRetry={retry} />
    </div>
  )
}
