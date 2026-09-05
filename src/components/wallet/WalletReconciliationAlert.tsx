import { formatMoney } from '../../utils/formatMoney'
import Alert from '../ui/Alert'
import {
  dashboardReconcileAlertClass,
  dashboardReconcileFormulaClass,
  reconcileDiffClass
} from '../ui/recordsStyles'

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
    <Alert variant={variant} className={dashboardReconcileAlertClass}>
      <strong>تطبیق کیف پول</strong>
      <p>
        کیف پول فعلی ({formatMoney(totalBalance)}) با مانده محاسبه‌شده ({formatMoney(periodBalance)}
        ) {reconciliationDiff > 0 ? 'بیشتر' : 'کمتر'} است.
      </p>
      <p dir="ltr" className={reconcileDiffClass}>
        اختلاف: {formatMoney(Math.abs(reconciliationDiff))}
        {reconciliationDiff > 0 ? ' +' : ' −'}
      </p>
      <p className={dashboardReconcileFormulaClass}>
        موجودی اول + درآمد − هزینه = مانده محاسبه‌شده
      </p>
    </Alert>
  )
}
