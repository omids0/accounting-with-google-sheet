import { formatMoney } from '../../utils/formatMoney'

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
  return (
    <div
      className={`alert ${
        Math.abs(reconciliationDiff) > 10000 ? 'alert-warning' : 'alert-info'
      } dashboard-reconcile-alert`}
    >
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
    </div>
  )
}
