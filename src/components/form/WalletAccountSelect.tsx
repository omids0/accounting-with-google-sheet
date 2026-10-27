import { useEffect, useState } from 'react'

import Select from './Select'
import { walletAccountOptions } from './walletAccountOptions'
import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'
import type { WalletAccount } from '../../types'
import { formHintClass } from '../ui/formStyles'

type WalletAccountSelectProps = {
  value: string
  onChange: (accountId: string) => void
  'aria-label'?: string
  /** Entry forms: say out loud that a record without an account moves no balance. */
  hintWhenEmpty?: boolean
  /** False removes «بدون حساب»: the caller needs an account (a transfer). Default true. */
  allowNone?: boolean
  /** Left out of the options, so «از» and «به» can never be the same account. */
  excludeId?: string
  /** Accounts the caller already holds; the select then does not fetch its own. */
  accounts?: WalletAccount[]
}

const NO_ACCOUNT_HINT =
  'بدون انتخاب حساب، این ثبت فقط به رکوردها اضافه می‌شود و موجودی هیچ حسابی تغییر نمی‌کند.'

/** Picks the wallet account whose balance an income/expense record moves. */
export default function WalletAccountSelect({
  value,
  onChange,
  'aria-label': ariaLabel = 'حساب',
  hintWhenEmpty = false,
  allowNone = true,
  excludeId,
  accounts: given
}: WalletAccountSelectProps) {
  const [fetched, setFetched] = useState<WalletAccount[]>([])
  const accounts = given ?? fetched

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (given || !spreadsheetId) return

    let active = true

    void fetchWalletAccounts(spreadsheetId)
      .then(items => active && setFetched(items))
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [given])

  const options = walletAccountOptions({ accounts, value, allowNone, excludeId })

  const showHint = hintWhenEmpty && !value && accounts.length > 0

  return (
    <>
      <Select value={value} onChange={onChange} options={options} aria-label={ariaLabel} />
      {showHint && <p className={formHintClass}>{NO_ACCOUNT_HINT}</p>}
    </>
  )
}
