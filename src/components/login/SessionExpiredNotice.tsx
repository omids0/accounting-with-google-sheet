import { useState } from 'react'

import { getPendingSyncCount } from '../../services/localDataWipe'
import { formatPersianNumber } from '../../utils/formatMoney'
import Alert from '../ui/Alert'

/** Shown instead of the sign-in pitch when a returning user's session expired. */
export default function SessionExpiredNotice() {
  const [pendingCount] = useState(getPendingSyncCount)

  return (
    <Alert variant="info" className="leading-[1.7]">
      <p className="font-bold">نشست شما منقضی شده.</p>
      <p>اطلاعات روی این دستگاه محفوظ است؛ برای ادامه دوباره وارد شوید.</p>
      {pendingCount > 0 && (
        <p className="mt-1">
          {formatPersianNumber(pendingCount)} تغییر هنوز به شیت نرسیده و بعد از ورود ارسال می‌شود.
        </p>
      )}
    </Alert>
  )
}
