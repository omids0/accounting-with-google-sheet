import { memberRoleLabel } from './memberCopy'
import { sharedCardActions, SHARED_ACTION_LABELS, type SharedCardState } from './sharedSpaceState'
import { getUserEmail } from '../../services/auth'
import { registryOf, type WorkspaceMember } from '../../services/memberRegistry'
import { SHARED_NO_ACCESS_BADGE, SHARED_NO_ACCESS_MESSAGE } from '../../services/sharedAccessLost'
import { isSharedOwner } from '../../services/sharedAccountSwitch'
import { sharedNameOf } from '../../services/sharedWorkspace'
import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import type { SpreadsheetEntry } from '../../types'
import { cn } from '../../utils/cn'
import Alert from '../ui/Alert'
import {
  buildingCardClass,
  buildingCardHeadClass,
  buildingCardTitleClass,
  buildingDayBadgeClass,
  journeyRowMetaClass
} from '../ui/buildingStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'

interface SharedSpaceCardProps {
  /** The shared account this device shows; null = not set up (or turned off here). */
  account: SpreadsheetEntry | null
  /** Its members; null while they are not known yet (the sheet is not open and Sheets is unread). */
  members: WorkspaceMember[] | null
  /** A shared account is registered but hidden: offer «روشن کردن دوباره». */
  hidden?: boolean
  /** 'denied' = this device cannot open the file (removed share or no grant): no «باز کردن». */
  state?: SharedCardState
  /** Opens the setup wizard. */
  onStart: () => void
  /** «اتصال به حساب مشترک»: the partner connects the file they were invited to. */
  onConnect: () => void
  onOpen: () => void
  onOff: () => void
  onShowAgain: () => void
  /** «اتصال دوباره»: the connect sheet, whose Picker grants this device the file again. */
  onReconnect?: () => void
  /** «پاک کردن از این دستگاه». */
  onForget?: () => void
  opening?: boolean
  forgetting?: boolean
}

const explainPoints = [
  'حساب شخصی شما همان‌طور که هست می‌ماند.',
  'شریک‌تان فقط فایل حساب مشترک را می‌بیند.',
  'هر لحظه می‌توانید خاموشش کنید.'
]

function Avatar({ email }: { email: string }) {
  return (
    <span
      className={cn(buildingDayBadgeClass, 'h-8 w-8 text-xs')}
      title={email}
      role="img"
      aria-label={email}
    >
      {email[0]?.toUpperCase() ?? '؟'}
    </span>
  )
}

/**
 * «حساب مشترک» on «فضاهای من»: the dashed offer (short explanation, «راه‌اندازی», and the words
 * that nothing changes until it is on) or, once it exists, the account's card with the member
 * avatars, the signed-in user's role, «باز کردن» and, for the owner, «خاموش کردن قابلیت».
 */
export default function SharedSpaceCard({
  account,
  members,
  hidden = false,
  state = 'normal',
  onStart,
  onConnect,
  onOpen,
  onOff,
  onShowAgain,
  onReconnect,
  onForget,
  opening = false,
  forgetting = false
}: SharedSpaceCardProps) {
  if (!account) {
    return (
      <>
        <Card className={cn(buildingCardClass, 'border-dashed')}>
          <div>
            <h2 className={buildingCardTitleClass}>حساب مشترک</h2>
            <p className={journeyRowMetaClass}>هزینه‌های مشترک شما و شریک‌تان در یک فایل جدا</p>
          </div>
          <ul className="list-disc ps-5 text-sm leading-[1.9] text-text">
            {explainPoints.map(point => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          {/* One shared account per person: a hidden one is turned on again, never made twice. */}
          {hidden ? (
            <Button type="button" onClick={onShowAgain}>
              روشن کردن دوباره
            </Button>
          ) : (
            <>
              <Button type="button" onClick={onStart}>
                راه‌اندازی
              </Button>
              <Button type="button" variant="secondary" onClick={onConnect}>
                اتصال به حساب مشترک
              </Button>
            </>
          )}
        </Card>
        <p className="mb-stack text-sm leading-[1.8] text-muted">
          این قابلیت اختیاری است. تا روشنش نکنید، در شیت و منوی شما هیچ چیز اضافه نمی‌شود.
        </p>
      </>
    )
  }

  const list = members ?? []

  const email = (getUserEmail() ?? '').trim().toLowerCase()

  const role =
    list.find(member => member.email === email)?.role ?? registryOf('shared').fallbackRole

  const denied = state === 'denied'

  const actions = sharedCardActions(state, Boolean(members && isSharedOwner(members)))

  const handlers = {
    open: onOpen,
    off: onOff,
    reconnect: () => onReconnect?.(),
    forget: () => onForget?.()
  }

  return (
    <Card className={buildingCardClass}>
      <div className={buildingCardHeadClass}>
        <div>
          <h2 className={buildingCardTitleClass}>
            {sharedNameOf(getSpreadsheetLabel(account.name))}
          </h2>
          {denied ? (
            <p className={cn(journeyRowMetaClass, 'font-bold text-warning')}>
              {SHARED_NO_ACCESS_BADGE}
            </p>
          ) : members ? (
            <p className={journeyRowMetaClass}>نقش شما: {memberRoleLabel('shared', role)}</p>
          ) : null}
        </div>
        <div className="flex gap-1" role="group" aria-label="اعضا">
          {list.map(member => (
            <Avatar key={member.email} email={member.email} />
          ))}
        </div>
      </div>
      {denied ? (
        <Alert variant="warning" className="mb-0">
          {SHARED_NO_ACCESS_MESSAGE}
        </Alert>
      ) : null}
      {actions.map(action => (
        <Button
          key={action}
          type="button"
          variant={action === 'open' || action === 'reconnect' ? 'primary' : 'secondary'}
          loading={action === 'open' ? opening : action === 'forget' ? forgetting : false}
          disabled={opening || forgetting}
          onClick={handlers[action]}
        >
          {SHARED_ACTION_LABELS[action]}
        </Button>
      ))}
    </Card>
  )
}
