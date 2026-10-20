import type { ReactNode } from 'react'

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
  note: string
  /** Inside a building only: this person is the manager («من»). */
  me?: boolean
}

/** A building narrows the list (residents, contractors, the manager) and labels each person. */
export type CounterpartiesScope = {
  header: (items: CounterpartyWithRow[]) => ReactNode
  filter: (items: CounterpartyWithRow[]) => CounterpartyWithRow[]
  /** Counterparty id to a short line under the name («پیمانکار», «ساکن · واحد ۳ · مالک»). */
  labels?: ReadonlyMap<string, string>
}

export type CounterpartiesPageProps = {
  active?: boolean
  scope?: CounterpartiesScope
}
