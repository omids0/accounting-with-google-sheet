import { useNavigate } from 'react-router'

import CloseYearStepRow from './CloseYearStepRow'
import type { CloseYearWizard } from './useCloseYear'
import { getPathForTab } from '../../routes/paths'
import { formatBackupDate } from '../../services/backupSummary'
import { isReconcileAvailable } from '../../services/bankSmsReconcileData'
import { formatPersianNumber } from '../../utils/formatMoney'
import CheckboxField from '../form/CheckboxField'
import Button from '../ui/Button'
import {
  closeYearAccountListClass,
  closeYearAccountRowClass,
  closeYearAccountStatusClass,
  closeYearAccountTitleClass
} from '../ui/closeYearStyles'

function reconcileHint(wizard: CloseYearWizard): string {
  const { smsAccounts, cashAccounts } = wizard.status.reconcile
  const left = smsAccounts.filter(account => !account.reconciled).length
  const cash = cashAccounts.length ? ' · نقدی را خودت تأیید کن' : ''

  if (!smsAccounts.length) {
    return isReconcileAvailable()
      ? `هیچ حسابی پیامک بانکی ندارد${cash}`
      : `تطبیق با پیامک فقط در اپ اندروید است${cash}`
  }
  if (!left) return `${formatPersianNumber(smsAccounts.length)} حساب بانکی با پیامک یکی است${cash}`

  return `${formatPersianNumber(left)} از ${formatPersianNumber(
    smsAccounts.length
  )} حساب بانکی از ۱ اسفند تطبیق نشده${cash}`
}

/** Step 1: every SMS-backed account reconciled since 1 Esfand; cash is ticked by hand. */
export default function CloseYearReconcileStep({ wizard }: { wizard: CloseYearWizard }) {
  const navigate = useNavigate()
  const { done, smsAccounts, cashAccounts } = wizard.status.reconcile
  const canOpen = isReconcileAvailable()

  return (
    <CloseYearStepRow
      index={1}
      done={done}
      title="تطبیق حساب‌ها"
      hint={wizard.accountsLoaded ? reconcileHint(wizard) : 'در حال خواندن حساب‌ها…'}
    >
      {smsAccounts.length ? (
        <ul className={closeYearAccountListClass}>
          {smsAccounts.map(account => (
            <li key={account.id} className={closeYearAccountRowClass}>
              <span className={closeYearAccountTitleClass}>{account.title}</span>
              {account.reconciled || !canOpen ? (
                <span className={closeYearAccountStatusClass(account.reconciled)}>
                  {account.reconciled && account.reconciledAt
                    ? `تطبیق شد؛ ${formatBackupDate(account.reconciledAt)}`
                    : 'تطبیق نشده'}
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    navigate(getPathForTab('wallet-reconcile', { walletAccountId: account.id }), {
                      state: { title: `تطبیق ${account.title}` }
                    })
                  }
                >
                  تطبیق
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {cashAccounts.length ? (
        <CheckboxField
          checked={!!wizard.closeState.cashConfirmed}
          onChange={wizard.confirmCash}
          label="نقدی را خودت تأیید کن"
          hint={`شمردم و با اپ یکی است: ${cashAccounts.map(account => account.title).join('، ')}`}
        />
      ) : null}
    </CloseYearStepRow>
  )
}
