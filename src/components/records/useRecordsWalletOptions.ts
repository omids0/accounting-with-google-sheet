import { useEffect, useMemo, useState } from 'react'

import { ALL_WALLET_ACCOUNTS, distinctWalletAccounts } from './recordsFilterPredicates'
import type { StoredRecord } from './recordsUtils'
import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'
import type { SelectOption } from '../form/Select'

const DELETED_ACCOUNT = 'حساب حذف‌شده'

/** «همه حساب‌ها» plus the accounts the loaded records name, titled from the wallet sheet. */
export function useRecordsWalletOptions(records: StoredRecord[]) {
  const ids = useMemo(() => distinctWalletAccounts(records), [records])
  const [titles, setTitles] = useState<Map<string, string>>(new Map())
  const hasIds = ids.length > 0

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!hasIds || !spreadsheetId) return

    let active = true

    void fetchWalletAccounts(spreadsheetId)
      .then(items => active && setTitles(new Map(items.map(item => [item.id, item.title]))))
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [hasIds])

  const options = useMemo<SelectOption[]>(
    () => [
      { value: ALL_WALLET_ACCOUNTS, label: 'همه حساب‌ها' },
      ...ids.map(id => ({ value: id, label: titles.get(id) ?? DELETED_ACCOUNT }))
    ],
    [ids, titles]
  )

  return { options, titleOf: (id: string) => titles.get(id) ?? DELETED_ACCOUNT }
}
