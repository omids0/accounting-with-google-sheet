import { alertClassName } from '../ui/Alert'
import Button from '../ui/Button'
import { entryDuplicateActionsClass, entryDuplicateLinkClass } from '../ui/entryAssistStyles'

/**
 * «احتمالاً قبلاً ثبت شده»: a record of the same amount from the last days. «همان است، وصل کن»
 * ties the settlement to it (no second record); «فرق دارد» forgets the match.
 */
export default function SettleDuplicateCard({
  text,
  linked,
  onLink,
  onDismiss
}: {
  text: string
  linked: boolean
  onLink: () => void
  onDismiss: () => void
}) {
  return (
    <div className={alertClassName('warning')} role="status">
      <b>{linked ? 'به این رکورد وصل می‌شود' : 'احتمالاً قبلاً ثبت شده'}</b>
      {` — ${text}`}
      <div className={entryDuplicateActionsClass}>
        {linked ? null : (
          <Button type="button" size="sm" variant="secondary" onClick={onLink}>
            همان است، وصل کن
          </Button>
        )}
        <button type="button" className={entryDuplicateLinkClass} onClick={onDismiss}>
          فرق دارد، رکورد جدید
        </button>
      </div>
    </div>
  )
}
