import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { LazyWalletAccountDetailPage } from './lazyPages'
import { RecordListSkeleton } from '../components/skeleton'
import Button from '../components/ui/Button'
import { emptyStateClass } from '../components/ui/displayStyles'
import type { WalletAccountWithRow } from '../components/wallet/types'
import { getSettings } from '../services/settings'
import { fetchWalletAccounts } from '../services/wallet'
import { handleSheetError } from '../utils/sheetError'

export default function WalletAccountDetailRoute() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const [account, setAccount] = useState<WalletAccountWithRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const settings = getSettings()

      if (!settings?.spreadsheetId || !accountId) {
        if (!cancelled) setLoading(false)

        return
      }

      try {
        const items = await fetchWalletAccounts(settings.spreadsheetId)

        if (!cancelled) {
          setAccount(items.find(item => item.id === accountId) ?? null)
          setLoading(false)
        }
      } catch (error) {
        handleSheetError(error)

        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [accountId])

  if (loading) {
    return <RecordListSkeleton />
  }

  if (!account) {
    return (
      <div className={emptyStateClass}>
        <p>حساب یافت نشد</p>
        <Button type="button" variant="primary" size="sm" onClick={() => navigate('/wallet')}>
          بازگشت به کیف پول
        </Button>
      </div>
    )
  }

  return <LazyWalletAccountDetailPage account={account} />
}
