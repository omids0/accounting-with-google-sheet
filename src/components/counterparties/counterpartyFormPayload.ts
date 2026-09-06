import type { CounterpartyFormState } from './types'

export function validateCounterpartyForm(values: CounterpartyFormState): string | null {
  if (!values.firstName.trim()) return 'نام الزامی است'
  if (!values.lastName.trim()) return 'نام خانوادگی الزامی است'

  return null
}

export function buildCounterpartyPayload(values: CounterpartyFormState) {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    birthDate: values.birthDate,
    address: values.address.trim(),
    location: values.location,
    phones: values.phones
      .map(phone => ({ number: phone.number.trim() }))
      .filter(phone => phone.number),
    accounts: values.accounts
      .map(account => ({
        bankName: account.bankName.trim(),
        accountNumber: account.accountNumber.trim()
      }))
      .filter(account => account.bankName || account.accountNumber),
    note: values.note.trim()
  }
}
