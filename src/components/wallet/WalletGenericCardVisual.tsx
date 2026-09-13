import type { CSSProperties } from 'react'

import type { WalletAccountWithRow } from './types'
import {
  walletGenericCardBadgeClass,
  walletGenericCardBalanceClass,
  walletGenericCardBottomRowClass,
  walletGenericCardClass,
  walletGenericCardNoteClass,
  walletGenericCardTitleClass,
  walletGenericCardTopRowClass,
  walletGenericCardWatermarkClass
} from './walletCardStyles'
import { resolveCardTheme } from './walletCardUtils'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'

type WalletGenericCardVisualProps = {
  account: Pick<
    WalletAccountWithRow,
    | 'title'
    | 'balance'
    | 'note'
    | 'accountKind'
    | 'cardColor'
    | 'cardColorPrimary'
    | 'cardColorSecondary'
    | 'bankId'
  >
  displayBalance?: number
  compact?: boolean
  className?: string
}

export default function WalletGenericCardVisual({
  account,
  displayBalance,
  compact,
  className
}: WalletGenericCardVisualProps) {
  const theme = resolveCardTheme(account)
  const balance = displayBalance ?? account.balance
  const accountTitle = account.title.trim()
  const note = account.note.trim()
  const headline = accountTitle || theme.label

  const cardStyle: CSSProperties = {
    background: theme.gradient,
    color: theme.text,
    ['--wallet-card-accent' as string]: theme.accent
  }

  return (
    <div
      className={cn(walletGenericCardClass, className)}
      style={cardStyle}
      data-compact={compact ? 'true' : undefined}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{ background: theme.pattern }}
        aria-hidden="true"
      />
      <div className={walletGenericCardWatermarkClass} aria-hidden="true">
        💳
      </div>

      <div className={walletGenericCardTopRowClass}>
        <div className="min-w-0">
          <span className={walletGenericCardBadgeClass}>{theme.label}</span>
          <div className={walletGenericCardTitleClass}>{headline}</div>
        </div>
      </div>

      <div className={walletGenericCardBottomRowClass}>
        <div className="min-w-0 flex-1 text-right">
          {note ? <div className={walletGenericCardNoteClass}>{note}</div> : null}
        </div>
        <div className={walletGenericCardBalanceClass} dir="ltr">
          {formatMoney(balance)}
        </div>
      </div>
    </div>
  )
}
