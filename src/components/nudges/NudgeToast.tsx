import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import { claimNudge, neverAskNudge } from '../../services/nudges'
import type { NudgeSignal } from '../../services/nudgeSignals'
import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'
import type { WalletAccount } from '../../types'
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

const NUDGE_TOAST_ID = 'nudge'

const NUDGE_MS = 8000

type CardProps = { message: string; offer: NudgeOffer; spreadsheetId: string; picking: boolean }

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

function NudgeCard({ message, offer, spreadsheetId, picking }: CardProps) {
  const close = () => toast.dismiss(NUDGE_TOAST_ID)

  const accept = () => {
    if (offer.pickAccount) return present({ message, offer, spreadsheetId, picking: true })
    close()
    offer.accept?.()
  }

  return (
    <div className={nudgeStackClass} role="status" aria-live="polite">
      <div className={nudgeSavedClass}>{message}</div>
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

/**
 * The «ذخیره شد» toast, with the first suggestion that passes the gate under it
 * (never a modal). Without one it is the plain success toast.
 */
export function showSavedWithNudge(message: string, offers: (NudgeOffer | null | false)[]) {
  const spreadsheetId = getSettings()?.spreadsheetId
  const offer =
    spreadsheetId &&
    offers.find(item => item && claimNudge(spreadsheetId, item.id, item.targetHasData))

  if (!spreadsheetId || !offer) return showSuccess(message)

  present({ message, offer, spreadsheetId, picking: false })
}
