import { useNavigate, useParams } from 'react-router'

import { LazyWalletAccountDetailPage } from './lazyPages'
import { RecordListSkeleton } from '../components/skeleton'
import Button from '../components/ui/Button'
import { emptyStateClass } from '../components/ui/displayStyles'
import { useWalletAccountRecord } from '../components/wallet/useWalletAccountRecord'

export default function WalletAccountDetailRoute() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const { record: account, loading, error, retry } = useWalletAccountRecord(accountId)

  if (loading) {
    return <RecordListSkeleton />
  }

  if (error) {
    return (
      <div className={emptyStateClass}>
        <p>خواندن حساب انجام نشد</p>
        <Button type="button" variant="primary" size="sm" onClick={retry}>
          تلاش دوباره
        </Button>
      </div>
    )
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
