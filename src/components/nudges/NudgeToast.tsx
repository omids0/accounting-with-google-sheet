import { useEffect, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'

import { claimNudge, neverAskNudge } from '../../services/nudges'
import type { NudgeSignal } from '../../services/nudgeSignals'
import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'
import type { WalletAccount } from '../../types'
import { haptic } from '../../utils/haptics'
import { showSuccess } from '../../utils/toast'
import Select from '../form/Select'
import Button from '../ui/Button'
import {
  nudgeActionsClass,
  nudgeCardClass,
  nudgeLinkClass,
  nudgeSavedClass,
  nudgeStackClass
} from '../ui/nudgeStyles'

export interface NudgeOffer extends NudgeSignal {
  title: string
  text?: string
  actionLabel: string
  accept?: () => void
  /** The positive answer opens an account field on the card instead. */
  pickAccount?: (accountId: string) => void
}

export const NUDGE_TOAST_ID = 'nudge'

const NUDGE_MS = 8000

/** A plain «ذخیره شد» with an option stays long enough to reach it. */
const SAVED_MS = 5000

type CardProps = {
  message: string
  offer: NudgeOffer
  spreadsheetId: string
  picking: boolean
  /** Under «ذخیره شد», e.g. the «تکرار ماهانه» option. */
  extra?: ReactNode
}

/** The saved record's account field, right on the card. */
function AccountField(props: { spreadsheetId: string; onPick: (accountId: string) => void }) {
  const [accounts, setAccounts] = useState<WalletAccount[]>([])

  useEffect(() => {
    void fetchWalletAccounts(props.spreadsheetId)
      .then(setAccounts)
      .catch(() => undefined)
  }, [props.spreadsheetId])

  return (
    <Select
      value=""
      onChange={accountId => accountId && props.onPick(accountId)}
      options={[
        { value: '', label: 'انتخاب حساب' },
        ...accounts.map(account => ({ value: account.id, label: account.title }))
      ]}
      aria-label="حساب کیف پول"
    />
  )
}

function NudgeCard({ message, offer, spreadsheetId, picking, extra }: CardProps) {
  const close = () => toast.dismiss(NUDGE_TOAST_ID)

  const accept = () => {
    if (offer.pickAccount) return present({ message, offer, spreadsheetId, picking: true, extra })
    close()
    offer.accept?.()
  }

  return (
    <div className={nudgeStackClass} role="status" aria-live="polite">
      <div className={nudgeSavedClass}>
        {message}
        {extra}
      </div>
      <div className={nudgeCardClass}>
        <b>{offer.title}</b>
        {offer.text}
        {picking ? (
          <AccountField
            spreadsheetId={spreadsheetId}
            onPick={accountId => {
              close()
              offer.pickAccount?.(accountId)
            }}
          />
        ) : null}
        <div className={nudgeActionsClass}>
          {picking ? null : (
            <Button type="button" size="sm" onClick={accept}>
              {offer.actionLabel}
            </Button>
          )}
          <button type="button" className={nudgeLinkClass} onClick={close}>
            نه
          </button>
          <button
            type="button"
            className={nudgeLinkClass}
            onClick={() => {
              neverAskNudge(spreadsheetId, offer.id)
              close()
            }}
          >
            دیگر نپرس
          </button>
        </div>
      </div>
    </div>
  )
}

/** Picking an account keeps the card until the user is done; otherwise it goes after 8 s. */
function present(props: CardProps) {
  toast.custom(<NudgeCard {...props} />, {
    id: NUDGE_TOAST_ID,
    duration: props.picking ? Infinity : NUDGE_MS
  })
}

/** The green «ذخیره شد» with an option inside, without a suggestion card. */
function showSavedOnly(message: string, extra: ReactNode) {
  haptic('light')
  toast.custom(
    <div className={nudgeStackClass} role="status" aria-live="polite">
      <div className={nudgeSavedClass}>
        {message}
        {extra}
      </div>
    </div>,
    { id: NUDGE_TOAST_ID, duration: SAVED_MS }
  )
}

/**
 * The «ذخیره شد» toast, with the first suggestion that passes the gate under it
 * (never a modal). Without one it is the plain success toast.
 */
export function showSavedWithNudge(
  message: string,
  offers: (NudgeOffer | null | false)[],
  extra?: ReactNode
) {
  const spreadsheetId = getSettings()?.spreadsheetId
  const offer =
    spreadsheetId &&
    offers.find(item => item && claimNudge(spreadsheetId, item.id, item.targetHasData))

  if (!spreadsheetId || !offer) return extra ? showSavedOnly(message, extra) : showSuccess(message)

  present({ message, offer, spreadsheetId, picking: false, extra })
}
