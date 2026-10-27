import { useEffect, useState } from 'react'

import Select from './Select'
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
}

const NO_ACCOUNT_LABEL = 'بدون حساب (موجودی تغییر نمی‌کند)'

const NO_ACCOUNT_HINT =
  'بدون انتخاب حساب، این ثبت فقط به رکوردها اضافه می‌شود و موجودی هیچ حسابی تغییر نمی‌کند.'

/** Picks the wallet account whose balance an income/expense record moves. */
export default function WalletAccountSelect({
  value,
  onChange,
  'aria-label': ariaLabel = 'حساب',
  hintWhenEmpty = false
}: WalletAccountSelectProps) {
  const [accounts, setAccounts] = useState<WalletAccount[]>([])

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    let active = true

    void fetchWalletAccounts(spreadsheetId)
      .then(items => active && setAccounts(items))
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  const options = [
    { value: '', label: NO_ACCOUNT_LABEL },
    ...accounts.map(account => ({ value: account.id, label: account.title })),
    // A record may name an account that was deleted since.
    ...(value && !accounts.some(account => account.id === value)
      ? [{ value, label: 'حساب حذف‌شده' }]
      : [])
  ]

  const showHint = hintWhenEmpty && !value && accounts.length > 0

  return (
    <>
      <Select value={value} onChange={onChange} options={options} aria-label={ariaLabel} />
      {showHint && <p className={formHintClass}>{NO_ACCOUNT_HINT}</p>}
    </>
  )
}
