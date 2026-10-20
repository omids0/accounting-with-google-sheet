import { useEffect, useState } from 'react'

import { loadPersonalAccounts } from '../../services/buildingBridge'
import FormField from '../form/FormField'
import Select from '../form/Select'

interface BridgeSettleAccountProps {
  value: string
  onChange: (accountId: string) => void
}

/**
 * «به حساب شخصی من»: where the manager's repaid money lands in their personal spreadsheet. The
 * accounts are read from that sheet directly (it is not the open one); the last choice is the
 * default, so the question is answered once and then only confirmed.
 */
export default function BridgeSettleAccount({ value, onChange }: BridgeSettleAccountProps) {
  const [accounts, setAccounts] = useState<{ id: string; title: string }[]>([])

  useEffect(() => {
    let live = true

    void loadPersonalAccounts()
      .then(items => live && setAccounts(items))
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [])

  return (
    <FormField
      label="به حساب شخصی من"
      hint="طلب شما از این ساختمان در شیت شخصی‌تان هم دریافت‌شده ثبت می‌شود."
      controlWidth="full"
    >
      <Select
        value={value}
        onChange={onChange}
        aria-label="حساب شخصی"
        options={[
          { value: '', label: 'بدون حساب (موجودی تغییر نمی‌کند)' },
          ...accounts.map(account => ({ value: account.id, label: account.title })),
          ...(value && !accounts.some(account => account.id === value)
            ? [{ value, label: 'حساب انتخاب‌شده' }]
            : [])
        ]}
      />
    </FormField>
  )
}
