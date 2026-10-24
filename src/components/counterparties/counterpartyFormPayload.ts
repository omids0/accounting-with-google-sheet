import type { CounterpartyFormState } from './types'
import { normalizePhone } from '../../utils/idValidators'

export const PHONE_ERROR = 'شماره تماس معتبر نیست'

/**
 * Form check of one phone (optional): an Iranian mobile, a landline with its area code, or an
 * international number («+» and 7–15 digits).
 * A number already saved on the counterparty stays accepted until the user changes it.
 */
export function phoneError(number: string, saved: readonly string[] = []): string | true {
  const text = number.trim()

  if (!text || saved.some(item => item.trim() === text)) return true

  return normalizePhone(text) !== null || PHONE_ERROR
}

function normalizeSavedPhone(number: string, saved: readonly string[]): string {
  const text = number.trim()

  return saved.some(item => item.trim() === text) ? text : normalizePhone(text) ?? text
}

export function validateCounterpartyForm(
  values: CounterpartyFormState,
  savedPhones: readonly string[] = []
): string | null {
  if (!values.firstName.trim()) return 'نام الزامی است'
  if (!values.lastName.trim()) return 'نام خانوادگی الزامی است'

  const badPhone = values.phones.find(phone => phoneError(phone.number, savedPhones) !== true)

  return badPhone ? PHONE_ERROR : null
}

/** `savedPhones`: the numbers already stored; they are kept exactly as they are. */
export function buildCounterpartyPayload(
  values: CounterpartyFormState,
  savedPhones: readonly string[] = []
) {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    birthDate: values.birthDate,
    address: values.address.trim(),
    location: values.location,
    phones: values.phones
      .map(phone => ({ number: normalizeSavedPhone(phone.number, savedPhones) }))
      .filter(phone => phone.number),
    accounts: values.accounts
      .map(account => ({
        bankName: account.bankName.trim(),
        accountNumber: account.accountNumber.trim()
      }))
      .filter(account => account.bankName || account.accountNumber),
    note: values.note.trim(),
    ...(values.me === undefined ? {} : { me: values.me })
  }
}
