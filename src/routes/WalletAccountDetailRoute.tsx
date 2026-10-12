import { useNavigate, useParams } from 'react-router'

import { LazyWalletAccountDetailPage } from './lazyPages'
import { RecordListSkeleton } from '../components/skeleton'
import Button from '../components/ui/Button'
import { emptyStateClass } from '../components/ui/displayStyles'
import type { WalletAccountWithRow } from '../components/wallet/types'
import { useRouteRecord } from '../hooks/useRouteRecord'

async function fetchAccounts(spreadsheetId: string): Promise<WalletAccountWithRow[]> {
  const { fetchWalletAccounts } = await import('../services/wallet')

  return fetchWalletAccounts(spreadsheetId)
}

export default function WalletAccountDetailRoute() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const { record: account, loading } = useRouteRecord(accountId, fetchAccounts)

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
