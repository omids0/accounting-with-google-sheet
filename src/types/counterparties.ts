export type CounterpartyAccount = {
  bankName: string
  accountNumber: string
}

export type CounterpartyPhone = {
  number: string
}

export type CounterpartyLocation = {
  lat: number
  lng: number
}

export type Counterparty = {
  id: string
  createdAt: string
  firstName: string
  lastName: string
  birthDate: string
  address: string
  location: CounterpartyLocation | null
  phones: CounterpartyPhone[]
  accounts: CounterpartyAccount[]
  note: string
  /** Round 11: a building owner or resident known only by a unit number until completed. */
  placeholder?: boolean
  /** Round 11: the manager's own person inside a building workspace (bridge B, Step 8). */
  me?: boolean
}
