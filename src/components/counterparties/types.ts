import type { Counterparty, CounterpartyLocation } from '../../types/counterparties'

export type CounterpartyWithRow = Counterparty & { rowNumber: number }

export type CounterpartyAccountFormState = {
  bankName: string
  accountNumber: string
}

export type CounterpartyPhoneFormState = {
  number: string
}

export type CounterpartyFormState = {
  firstName: string
  lastName: string
  birthDate: string
  address: string
  location: CounterpartyLocation | null
  phones: CounterpartyPhoneFormState[]
  accounts: CounterpartyAccountFormState[]
}

export type CounterpartiesPageProps = {
  active?: boolean
}
