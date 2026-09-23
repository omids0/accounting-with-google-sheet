import { CASH_CARD_THEME, GENERIC_CARD_THEME, getBankById, type BankCardTheme } from './banks'
import {
  buildCustomCardTheme,
  getCustomColorDefaults,
  isCustomCardColor,
  normalizeHexColor
} from './customCardTheme'
import { WALLET_ACCOUNT_KIND_BANK, WALLET_ACCOUNT_KIND_CASH } from '../../services/walletCategories'
import type { WalletAccount, WalletAccountKind } from '../../types'
import { normalizeDigits } from '../../utils/normalizeDigits'

/** Recognizes both the current label-based storage and legacy 'bank'/'cash'/'other' codes. */
export function resolveAccountKind(account: Pick<WalletAccount, 'accountKind'>): WalletAccountKind {
  if (account.accountKind === 'bank' || account.accountKind === WALLET_ACCOUNT_KIND_BANK) {
    return 'bank'
  }
  if (account.accountKind === 'cash' || account.accountKind === WALLET_ACCOUNT_KIND_CASH) {
    return 'cash'
  }

  return 'other'
}

function resolveBaseCardTheme(
  account: Pick<WalletAccount, 'accountKind' | 'bankId' | 'cardColor'>
): BankCardTheme {
  const kind = resolveAccountKind(account)
  const presetColor = isCustomCardColor(account.cardColor) ? '' : account.cardColor

  if (kind === 'bank') {
    const bank = getBankById(account.bankId, presetColor)

    if (bank) return bank
  }

  if (kind === 'cash') return CASH_CARD_THEME

  return GENERIC_CARD_THEME
}

export function resolveCardTheme(
  account: Pick<
    WalletAccount,
    'accountKind' | 'bankId' | 'cardColor' | 'cardColorPrimary' | 'cardColorSecondary'
  >
): BankCardTheme {
  if (isCustomCardColor(account.cardColor)) {
    const base = resolveBaseCardTheme(account)
    const defaults = getCustomColorDefaults(base)

    return buildCustomCardTheme({
      primary: normalizeHexColor(account.cardColorPrimary) || defaults.primary,
      secondary: normalizeHexColor(account.cardColorSecondary) || defaults.secondary,
      label: base.label,
      initials: base.initials,
      id: base.id
    })
  }

  return resolveBaseCardTheme(account)
}

export function normalizeCardNumber(value: string): string {
  return normalizeDigits(value).replace(/\D/g, '').slice(0, 16)
}

export function formatCardNumberInput(value: string): string {
  const digits = normalizeCardNumber(value)
  const groups = digits.match(/.{1,4}/g)

  return groups ? groups.join(' ') : ''
}

export function formatCardNumberDisplay(cardNumber: string): string {
  const digits = normalizeCardNumber(cardNumber)
  const normalized = (digits || '0000000000000000').padEnd(16, '0').slice(0, 16)

  return `${normalized.slice(0, 4)} ${normalized.slice(4, 8)} ${normalized.slice(
    8,
    12
  )} ${normalized.slice(12, 16)}`
}

export function isValidCardNumber(cardNumber: string): boolean {
  return normalizeCardNumber(cardNumber).length === 16
}
