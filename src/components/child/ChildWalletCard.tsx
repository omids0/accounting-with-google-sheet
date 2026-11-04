import { useEffect, useState } from 'react'

import { useDataRevision } from '../../services/dataRevision'
import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'
import CalmBlock from '../CalmBlock'
import MoneyText from '../MoneyText'
import {
  calmListClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

interface Account {
  id: string
  title: string
  balance: number
}

/**
 * «کیف پول» of the child: each account's name and balance. Only those two columns are shown, never
 * a card number, IBAN or holder name, even though the mirror holds them.
 */
export default function ChildWalletCard() {
  const revision = useDataRevision()
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    const id = getSettings()?.spreadsheetId

    if (!id) return

    let live = true

    void fetchWalletAccounts(id)
      .then(list => {
        if (live)
          setAccounts(
            list.map(({ id: accountId, title, balance }) => ({ id: accountId, title, balance }))
          )
      })
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [revision])

  if (!accounts.length) return null

  return (
    <CalmBlock title="کیف پول" icon="wallet">
      <ul className={calmListClass}>
        {accounts.map(account => (
          <li key={account.id} className={calmRowClass}>
            <span className={calmRowMainClass}>
              <span className={calmRowTitleClass}>{account.title || 'حساب'}</span>
            </span>
            <span className={calmRowEndClass}>
              <MoneyText amount={account.balance} />
            </span>
          </li>
        ))}
      </ul>
    </CalmBlock>
  )
}
