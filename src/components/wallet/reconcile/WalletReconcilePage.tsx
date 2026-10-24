import { useNavigate, useParams } from 'react-router'

import { ReconcileFooter, ReconcileSummary } from './ReconcileCards'
import ReconcileLists from './ReconcileLists'
import { useReconcileWizard } from './useReconcileWizard'
import { isReconcileAvailable } from '../../../services/bankSmsReconcileData'
import EmptyState from '../../EmptyState'
import { RecordListSkeleton } from '../../skeleton'
import { useWalletAccountRecord } from '../useWalletAccountRecord'

/**
 * Mobile: summary, the two lists, footer. Desktop: lists on the right, summary and
 * footer stacked on the left (RTL: the first grid column is the right one).
 */
const layoutClass =
  'flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] md:grid-rows-[auto_1fr] md:items-start md:gap-5'

function AccountNotFound({ onBack }: { onBack: () => void }) {
  return (
    <EmptyState
      icon="wallet"
      message="حساب یافت نشد"
      action={{ label: 'بازگشت به کیف پول', icon: 'back', onClick: onBack }}
    />
  )
}

function WizardBody({ accountId }: { accountId: string }) {
  const wizard = useReconcileWizard(accountId)
  const navigate = useNavigate()

  if (wizard.loading) return <RecordListSkeleton />

  if (!wizard.view) return <AccountNotFound onBack={() => navigate('/wallet')} />

  return (
    <div className={layoutClass}>
      <div className="md:col-start-2 md:row-start-1">
        <ReconcileSummary wizard={wizard} />
      </div>
      <div className="md:col-start-1 md:row-span-2 md:row-start-1">
        <ReconcileLists wizard={wizard} />
      </div>
      <div className="md:col-start-2 md:row-start-2">
        <ReconcileFooter wizard={wizard} />
      </div>
    </div>
  )
}

/** `/wallet/reconcile/:accountId` — «تطبیق <حساب>» with the bank SMS (round 7, Task A). */
export default function WalletReconcilePage() {
  const { accountId = '' } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const { record, loading } = useWalletAccountRecord(accountId)

  // An unknown account is named first: the Android-only note would hide that the link is wrong.
  if (loading) return <RecordListSkeleton />

  if (!record) return <AccountNotFound onBack={() => navigate('/wallet')} />

  if (!isReconcileAvailable()) {
    return (
      <EmptyState
        icon="wallet"
        message="تطبیق با پیامک فقط در اپ اندروید"
        description="پیامک‌های بانکی را در «پیامک‌های بانکی» روشن کن تا موجودی هر حساب با آخرین پیامک بانک مقایسه شود."
      />
    )
  }

  return <WizardBody accountId={accountId} />
}
