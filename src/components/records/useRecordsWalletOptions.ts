import { useCallback, useEffect, useMemo, useState } from 'react'

import { ALL_WALLET_ACCOUNTS, distinctWalletAccounts } from './recordsFilterPredicates'
import type { StoredRecord } from './recordsUtils'
import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'
import type { SelectOption } from '../form/Select'

const DELETED_ACCOUNT = 'حساب حذف‌شده'

/**
 * «همه حساب‌ها» plus the accounts the loaded records name, titled from the wallet sheet.
 * Until the titles have loaded (or if the read fails) only «همه حساب‌ها» is offered and no
 * account has a title; «حساب حذف‌شده» is used only once the read succeeded and the id is gone.
 */
export function useRecordsWalletOptions(records: StoredRecord[]) {
  const ids = useMemo(() => distinctWalletAccounts(records), [records])
  const [titles, setTitles] = useState<Map<string, string> | null>(null)
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

  const titleOf = useCallback(
    (id: string) => (titles ? titles.get(id) ?? DELETED_ACCOUNT : undefined),
    [titles]
  )

  const options = useMemo<SelectOption[]>(
    () => [
      { value: ALL_WALLET_ACCOUNTS, label: 'همه حساب‌ها' },
      ...(titles ? ids.map(id => ({ value: id, label: titleOf(id) ?? DELETED_ACCOUNT })) : [])
    ],
    [ids, titles, titleOf]
  )

  return { options, titleOf }
}
