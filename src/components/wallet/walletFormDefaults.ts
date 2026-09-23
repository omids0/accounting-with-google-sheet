import { hasBankColorPalette, parseBankCardColor } from './bankCardColorVariants'
import { CASH_CARD_THEME, GENERIC_CARD_THEME, getBankById, resolveBankInternalId } from './banks'
import {
  CUSTOM_CARD_COLOR_ID,
  DEFAULT_CUSTOM_CARD_PRIMARY,
  DEFAULT_CUSTOM_CARD_SECONDARY,
  getCustomColorDefaults,
  isCustomCardColor,
  normalizeHexColor
} from './customCardTheme'
import type { WalletAccountWithRow, WalletFormState } from './types'
import { resolveAccountKind } from './walletCardUtils'
import {
  resolveWalletAccountKindLabel,
  WALLET_ACCOUNT_KIND_BANK
} from '../../services/walletCategories'
import type { WalletAccountKind } from '../../types'

export const EMPTY_WALLET_FORM: WalletFormState = {
  title: '',
  balance: '',
  note: '',
  accountKind: WALLET_ACCOUNT_KIND_BANK,
  bankId: '',
  cardNumber: '',
  cardHolder: '',
  cardColor: '',
  cardColorPrimary: DEFAULT_CUSTOM_CARD_PRIMARY,
  cardColorSecondary: DEFAULT_CUSTOM_CARD_SECONDARY,
  iban: '',
  accountNumber: ''
}

function resolveInitialCustomColors(account: WalletAccountWithRow) {
  const kind = resolveAccountKind(account)
  let base = GENERIC_CARD_THEME

  if (kind === 'bank' && account.bankId) {
    base = getBankById(account.bankId) ?? GENERIC_CARD_THEME
  } else if (kind === 'cash') {
    base = CASH_CARD_THEME
  }

  const defaults = getCustomColorDefaults(base)

  return {
    primary: normalizeHexColor(account.cardColorPrimary) || defaults.primary,
    secondary: normalizeHexColor(account.cardColorSecondary) || defaults.secondary
  }
}

export function buildWalletFormInitialValues(
  editingAccount: WalletAccountWithRow | null
): WalletFormState {
  if (!editingAccount) return EMPTY_WALLET_FORM

  const customColors = resolveInitialCustomColors(editingAccount)
  const internalBankId = resolveBankInternalId(editingAccount.bankId)

  return {
    title: editingAccount.title,
    balance: editingAccount.balance,
    note: editingAccount.note,
    accountKind: resolveWalletAccountKindLabel(editingAccount.accountKind),
    bankId: getBankById(editingAccount.bankId)?.label ?? editingAccount.bankId,
    cardNumber: editingAccount.cardNumber,
    cardHolder: editingAccount.cardHolder,
    iban: editingAccount.iban,
    accountNumber: editingAccount.accountNumber,
    cardColor: isCustomCardColor(editingAccount.cardColor)
      ? CUSTOM_CARD_COLOR_ID
      : parseBankCardColor(internalBankId, editingAccount.cardColor),
    cardColorPrimary: customColors.primary,
    cardColorSecondary: customColors.secondary
  }
}

export function buildWalletPreviewAccount(
  watched: Partial<WalletFormState>,
  bankId: string,
  accountKind: WalletAccountKind
) {
  const internalBankId = resolveBankInternalId(bankId)

  return {
    title: watched.title ?? '',
    balance: watched.balance === '' ? 0 : Number(watched.balance),
    note: watched.note ?? '',
    accountKind,
    bankId,
    cardNumber: watched.cardNumber ?? '',
    cardHolder: watched.cardHolder ?? '',
    iban: watched.iban ?? '',
    accountNumber: watched.accountNumber ?? '',
    cardColor: isCustomCardColor(watched.cardColor ?? '')
      ? CUSTOM_CARD_COLOR_ID
      : accountKind === 'bank' && hasBankColorPalette(internalBankId)
      ? parseBankCardColor(internalBankId, watched.cardColor ?? '')
      : watched.cardColor ?? '',
    cardColorPrimary: watched.cardColorPrimary ?? DEFAULT_CUSTOM_CARD_PRIMARY,
    cardColorSecondary: watched.cardColorSecondary ?? DEFAULT_CUSTOM_CARD_SECONDARY
  }
}
