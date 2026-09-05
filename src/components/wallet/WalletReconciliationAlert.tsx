import { formatMoney } from '../../utils/formatMoney'
import Alert from '../ui/Alert'

type WalletReconciliationAlertProps = {
  totalBalance: number
  periodBalance: number
  reconciliationDiff: number
}

export default function WalletReconciliationAlert({
  totalBalance,
  periodBalance,
  reconciliationDiff
}: WalletReconciliationAlertProps) {
  const variant = Math.abs(reconciliationDiff) > 10000 ? 'warning' : 'info'

  return (
    <Alert variant={variant} className="dashboard-reconcile-alert">
      <strong>تطبیق کیف پول</strong>
      <p>
        کیف پول فعلی ({formatMoney(totalBalance)}) با مانده محاسبه‌شده ({formatMoney(periodBalance)}
        ) {reconciliationDiff > 0 ? 'بیشتر' : 'کمتر'} است.
      </p>
      <p dir="ltr" className="reconcile-diff">
        اختلاف: {formatMoney(Math.abs(reconciliationDiff))}
        {reconciliationDiff > 0 ? ' +' : ' −'}
      </p>
      <p className="dashboard-reconcile-formula">موجودی اول + درآمد − هزینه = مانده محاسبه‌شده</p>
    </Alert>
  )
}
