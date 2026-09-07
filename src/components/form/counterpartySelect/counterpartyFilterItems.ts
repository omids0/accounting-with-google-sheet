import type { CounterpartyWithRow } from '../../counterparties/types'

export function counterpartyFromFilterName(name: string, index: number): CounterpartyWithRow {
  return {
    id: `filter-counterparty-${index}`,
    rowNumber: -(index + 1),
    createdAt: '',
    firstName: name,
    lastName: '',
    birthDate: '',
    address: '',
    location: null,
    phones: [],
    accounts: [],
    note: ''
  }
}

export function counterpartiesFromFilterNames(names: string[]): CounterpartyWithRow[] {
  return names.map((name, index) => counterpartyFromFilterName(name, index))
}
