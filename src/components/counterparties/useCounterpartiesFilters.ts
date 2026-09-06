import type { CounterpartyWithRow } from './types'
import { useListFilters } from '../../hooks/useListFilters'
import { formatLocationLabel } from '../../services/counterparties'

type UseCounterpartiesFiltersOptions = {
  items: CounterpartyWithRow[]
}

export function useCounterpartiesFilters({ items }: UseCounterpartiesFiltersOptions) {
  return useListFilters({
    items,
    getSearchParts: item => [
      item.firstName,
      item.lastName,
      item.address,
      formatLocationLabel(item.location),
      item.birthDate,
      ...item.phones.map(phone => phone.number),
      ...item.accounts.flatMap(account => [account.bankName, account.accountNumber])
    ],
    getDate: item => item.birthDate
  })
}
