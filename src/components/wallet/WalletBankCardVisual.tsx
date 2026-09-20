import type { CSSProperties } from 'react'

import type { WalletAccountWithRow } from './types'
import {
  walletBankCardBalanceClass,
  walletBankCardBottomRowClass,
  walletBankCardBrandClass,
  walletBankCardChipClass,
  walletBankCardTopLeftClass,
  walletBankCardClass,
  walletBankCardContactlessClass,
  walletBankCardCopyBtnClass,
  walletBankCardExtraInfoClass,
  walletBankCardExtraInfoItemClass,
  walletBankCardHolderClass,
  walletBankCardLogoClass,
  walletBankCardNumberCenterClass,
  walletBankCardNumberWrapClass,
  walletBankCardTitleClass,
  walletBankCardTopRowClass
} from './walletCardStyles'
import { formatCardNumberDisplay, normalizeCardNumber, resolveCardTheme } from './walletCardUtils'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import AppIcon from '../AppIcon'

type WalletBankCardVisualProps = {
  account: Pick<
    WalletAccountWithRow,
    | 'title'
    | 'balance'
    | 'accountKind'
    | 'bankId'
    | 'cardNumber'
    | 'cardHolder'
    | 'cardColor'
    | 'cardColorPrimary'
    | 'cardColorSecondary'
    | 'note'
    | 'iban'
    | 'accountNumber'
  >
  displayBalance?: number
  compact?: boolean
  className?: string
}

function CardCopyButton({ value, label }: { value: string; label: string }) {
  const { copy } = useCopyToClipboard()

  if (!value) return null

  return (
    <button
      type="button"
      className={walletBankCardCopyBtnClass}
      aria-label={label}
      title={label}
      onClick={event => {
        event.stopPropagation()
        void copy(value, `${label} شد`)
      }}
    >
      <AppIcon name="copy" size={11} strokeWidth={2} />
    </button>
  )
}

function ContactlessIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.5 12.5c1.2-2.2 3.8-2.2 5 0M6 10c2.4-4.2 7.6-4.2 10 0M3.5 7.5c3.6-6.2 11.4-6.2 15 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function WalletBankCardVisual({
  account,
  displayBalance,
  compact,
  className
}: WalletBankCardVisualProps) {
  const theme = resolveCardTheme(account)
  const balance = displayBalance ?? account.balance
  const showCardNumber = Boolean(account.cardNumber)
  const accountTitle = account.title.trim()
  const showTitleBesideBank = Boolean(accountTitle) && accountTitle !== theme.label
  const holderLabel = account.cardHolder.trim() || (showTitleBesideBank ? '' : accountTitle)
  const subtitle = account.note.trim()
  const iban = account.iban.trim()
  const accountNumber = account.accountNumber.trim()

  const cardStyle: CSSProperties = {
    background: theme.gradient,
    color: theme.text,
    ['--wallet-card-accent' as string]: theme.accent
  }

  return (
    <div
      className={cn(walletBankCardClass, className)}
      style={cardStyle}
      data-compact={compact ? 'true' : undefined}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{ background: theme.pattern }}
        aria-hidden="true"
      />

      <div className={walletBankCardTopRowClass}>
        <div className={walletBankCardBrandClass}>
          <span className={walletBankCardLogoClass}>{theme.initials}</span>
          <span>
            {theme.label}
            {showTitleBesideBank && (
              <span className="font-medium opacity-85"> ({accountTitle})</span>
            )}
          </span>
        </div>
        <div className={walletBankCardTopLeftClass}>
          <span className={walletBankCardContactlessClass}>
            <ContactlessIcon />
          </span>
          <div className={walletBankCardChipClass} aria-hidden="true" />
        </div>
      </div>

      <div className={walletBankCardNumberWrapClass}>
        {showCardNumber && (
          <div className="flex items-center justify-center gap-[0.4rem]">
            <div className={walletBankCardNumberCenterClass} dir="ltr" lang="en">
              {formatCardNumberDisplay(account.cardNumber)}
            </div>
            <CardCopyButton
              value={normalizeCardNumber(account.cardNumber)}
              label="کپی شماره کارت"
            />
          </div>
        )}
      </div>

      {(iban || accountNumber) && (
        <div className={walletBankCardExtraInfoClass}>
          {accountNumber && (
            <span className={walletBankCardExtraInfoItemClass}>
              <span>شماره حساب:</span>
              <span dir="ltr" lang="en" className="truncate">
                {accountNumber}
              </span>
              <CardCopyButton value={accountNumber} label="کپی شماره حساب" />
            </span>
          )}
          {iban && (
            <span className={walletBankCardExtraInfoItemClass}>
              <span>شبا:</span>
              <span dir="ltr" lang="en" className="truncate">
                {iban}
              </span>
              <CardCopyButton value={iban} label="کپی شماره شبا" />
            </span>
          )}
        </div>
      )}

      <div className={walletBankCardBottomRowClass}>
        <div className="min-w-0 flex-1 text-right">
          <div className={walletBankCardHolderClass}>{holderLabel}</div>
          {subtitle && <div className={walletBankCardTitleClass}>{subtitle}</div>}
        </div>
        <div className={walletBankCardBalanceClass} dir="ltr">
          {formatMoney(balance)}
        </div>
      </div>
    </div>
  )
}
