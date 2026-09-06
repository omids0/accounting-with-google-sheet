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
}
