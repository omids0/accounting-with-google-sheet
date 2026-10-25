import HelpHint from '../HelpHint'
import { HELP_HINTS } from '../helpHints'
import MoneyText from '../MoneyText'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import {
  dashboardReconcileAlertClass,
  dashboardReconcileFormulaClass,
  reconcileDiffClass
} from '../ui/recordsStyles'

type WalletReconciliationAlertProps = {
  totalBalance: number
  periodBalance: number
  reconciliationDiff: number
  reconciling?: boolean
  onReconcile?: () => void
  /** Opens «ردیاب اختلاف», which finds out where the difference comes from. */
  onTrace?: () => void
}

export default function WalletReconciliationAlert({
  totalBalance,
  periodBalance,
  reconciliationDiff,
  reconciling = false,
  onReconcile,
  onTrace
}: WalletReconciliationAlertProps) {
  const variant = Math.abs(reconciliationDiff) > 10000 ? 'warning' : 'info'

  return (
    <Alert variant={variant} className={dashboardReconcileAlertClass}>
      <strong>
        تطبیق کیف پول
        <HelpHint {...HELP_HINTS.reconciliation} />
      </strong>
      <p>
        کیف پول فعلی (<MoneyText amount={totalBalance} />) از مانده محاسبه‌شده (
        <MoneyText amount={periodBalance} />) {reconciliationDiff > 0 ? 'بیشتر' : 'کمتر'} است.
      </p>
      <p className={reconcileDiffClass}>
        اختلاف: <MoneyText amount={reconciliationDiff} signed="plus" />
      </p>
      <p className={dashboardReconcileFormulaClass}>
        موجودی اول + درآمد − هزینه = مانده محاسبه‌شده
      </p>
      <div className="flex flex-wrap gap-2">
        {onTrace && (
          <Button type="button" variant="primary" size="sm" onClick={onTrace}>
            پیدا کردن علت اختلاف
          </Button>
        )}
        {onReconcile && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onReconcile}
            disabled={reconciling}
            loading={reconciling}
          >
            ثبت {reconciliationDiff > 0 ? 'درآمد' : 'هزینه'} اصلاح موجودی
          </Button>
        )}
      </div>
    </Alert>
  )
}
