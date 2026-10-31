import { useState } from 'react'

import { informSentence } from './informNoticeText'
import { dismissNotice, type StoredNotice } from '../../services/sharedNotices'
import { showError } from '../../utils/toast'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  guideCardClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'

interface SharedInformNoticeProps {
  sharedId: string
  notice: StoredNotice
  nameOf: (email: string) => string
}

/**
 * «مادر مبلغ «قبض برق» را از ۸۰۰٬۰۰۰ به ۸۵۰٬۰۰۰ تومان تغییر داد» + «باشه»: tells the creator of a
 * record that someone else changed or deleted it. Nothing is applied; «باشه» only removes it.
 */
export default function SharedInformNotice({ sharedId, notice, nameOf }: SharedInformNoticeProps) {
  const [busy, setBusy] = useState(false)

  const dismiss = async () => {
    setBusy(true)
    try {
      await dismissNotice(sharedId, notice.id)
    } catch {
      showError('اعلان به‌روز نشد؛ اتصال را بررسی کنید و دوباره امتحان کنید')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={guideCardClass} role="note">
      <span className={guideCardIconClass} aria-hidden="true">
        <AppIcon name="bell" size={20} />
      </span>
      <span className={guideCardTextClass}>
        <span className={guideCardTitleClass}>
          {informSentence(notice, nameOf(notice.by), nameOf)}
        </span>
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={() => void dismiss()}
      >
        باشه
      </Button>
    </Card>
  )
}
