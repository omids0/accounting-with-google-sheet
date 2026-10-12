import { useState } from 'react'

import NotificationHowTo from './NotificationHowTo'
import Alert from '../ui/Alert'
import Button from '../ui/Button'

interface ReminderPermissionPromptProps {
  /** One sentence on why this reminder needs notifications. */
  reason: string
  native: boolean
  denied: boolean
  requesting: boolean
  onGrant: () => void
  onDismiss: () => void
}

/** Shown under a reminder the user just turned on while notifications are not allowed. */
export default function ReminderPermissionPrompt({
  reason,
  native,
  denied,
  requesting,
  onGrant,
  onDismiss
}: ReminderPermissionPromptProps) {
  const [howTo, setHowTo] = useState(false)

  return (
    <Alert variant="warning" className="mt-2 mb-0">
      <p className="m-0">{reason}</p>
      {denied && <p className="mt-2 mb-0 text-[0.78rem]">اجازهٔ اعلان قبلاً رد شده است.</p>}
      {denied && howTo && <NotificationHowTo native={native} />}
      <div className="mt-3 flex flex-wrap gap-2">
        {denied ? (
          !howTo && (
            <Button type="button" variant="primary" size="sm" onClick={() => setHowTo(true)}>
              چطور فعال کنم؟
            </Button>
          )
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onGrant}
            disabled={requesting}
            loading={requesting}
          >
            اجازه بده
          </Button>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={onDismiss}>
          بعداً
        </Button>
      </div>
    </Alert>
  )
}
