import { getDefaultBankCardColor, hasBankColorPalette } from './bankCardColorVariants'
import { resolveBankInternalId } from './banks'
import { CUSTOM_CARD_COLOR_ID, isCustomCardColor, normalizeHexColor } from './customCardTheme'
import type { WalletFormState } from './types'
import { resolveAccountKind } from './walletCardUtils'
import { learnSmsRef } from '../../services/bankSmsPrefs'
import { createSmsTemplate } from '../../services/bankSmsTemplates'
import { createWalletAccount, type WalletAccountInput } from '../../services/wallet'
import { logBalanceSet } from '../../services/walletLedger'
import { normalizeSheba } from '../../utils/idValidators'
import type { SmsTemplateDraft } from '../bankSms/SmsSampleEditor'

export function buildWalletAccountPayload(form: WalletFormState): WalletAccountInput {
  const useCustomColor = isCustomCardColor(form.cardColor)
  const isBankAccount = resolveAccountKind({ accountKind: form.accountKind }) === 'bank'
  const internalBankId = resolveBankInternalId(form.bankId)

  return {
    title: form.title.trim(),
    balance: Number(form.balance),
    note: form.note.trim(),
    accountKind: form.accountKind,
    bankId: isBankAccount ? form.bankId : '',
    cardNumber: isBankAccount ? form.cardNumber : '',
    cardHolder: isBankAccount ? form.cardHolder.trim() : '',
    accountNumber: isBankAccount ? form.accountNumber.trim() : '',
    iban: isBankAccount ? normalizeSheba(form.iban) ?? form.iban.trim() : '',
    cardColor: useCustomColor
      ? CUSTOM_CARD_COLOR_ID
      : isBankAccount && hasBankColorPalette(internalBankId)
      ? form.cardColor || getDefaultBankCardColor(internalBankId)
      : '',
    cardColorPrimary: useCustomColor ? normalizeHexColor(form.cardColorPrimary) : '',
    cardColorSecondary: useCustomColor ? normalizeHexColor(form.cardColorSecondary) : ''
  }
}

/** Creates the account, logs its starting balance and saves the sample-SMS templates. */
export async function createWalletAccountFromForm(
  spreadsheetId: string,
  form: WalletFormState,
  smsDrafts: SmsTemplateDraft[]
) {
  const account = await createWalletAccount(spreadsheetId, buildWalletAccountPayload(form))

  await logBalanceSet(spreadsheetId, account.id, 0, account.balance, 'موجودی اولیه')

  for (const { sampleRef, ...draft } of smsDrafts) {
    await createSmsTemplate(spreadsheetId, { ...draft, accountId: account.id })
    learnSmsRef(sampleRef, account.id)
  }

  return account
}
