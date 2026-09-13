import type { CSSProperties } from 'react'

import type { WalletAccountWithRow } from './types'
import {
  walletCashCardBadgeClass,
  walletCashCardBalanceClass,
  walletCashCardBottomRowClass,
  walletCashCardClass,
  walletCashCardNoteClass,
  walletCashCardTitleClass,
  walletCashCardTopRowClass,
  walletCashCardWatermarkClass
} from './walletCardStyles'
import { resolveCardTheme } from './walletCardUtils'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'

type WalletCashCardVisualProps = {
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

export default function WalletCashCardVisual({
  account,
  displayBalance,
  compact,
  className
}: WalletCashCardVisualProps) {
  const theme = resolveCardTheme(account)
  const balance = displayBalance ?? account.balance
  const accountTitle = account.title.trim()
  const note = account.note.trim()
  const headline = accountTitle || 'صندوق نقدی'

  const cardStyle: CSSProperties = {
    background: theme.gradient,
    color: theme.text,
    ['--wallet-card-accent' as string]: theme.accent
  }

  return (
    <div
      className={cn(walletCashCardClass, className)}
      style={cardStyle}
      data-compact={compact ? 'true' : undefined}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{ background: theme.pattern }}
        aria-hidden="true"
      />
      <div className={walletCashCardWatermarkClass} aria-hidden="true">
        💵
      </div>

      <div className={walletCashCardTopRowClass}>
        <div className="min-w-0">
          <span className={walletCashCardBadgeClass}>نقدی</span>
          <div className={walletCashCardTitleClass}>{headline}</div>
        </div>
      </div>

      <div className={walletCashCardBottomRowClass}>
        <div className="min-w-0 flex-1 text-right">
          {note ? <div className={walletCashCardNoteClass}>{note}</div> : null}
        </div>
        <div className={walletCashCardBalanceClass} dir="ltr">
          {formatMoney(balance)}
        </div>
      </div>
    </div>
  )
}
