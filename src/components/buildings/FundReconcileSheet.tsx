import { useEffect, useState } from 'react'

import { fundCorrection } from '../../services/buildingFund'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountField from '../AmountField'
import { FormField } from '../form'
import FormModal from '../FormModal'
import MoneyText from '../MoneyText'
import { alertClassName } from '../ui/Alert'
import type { WalletAccountWithRow } from '../wallet/types'

interface FundReconcileSheetProps {
  /** The account to reconcile; null = closed. */
  account: WalletAccountWithRow | null
  saving: boolean
  onSave: (realBalance: number, note: string) => void
  onClose: () => void
}

/**
 * «تطبیق موجودی با بانک»: the real balance goes in on the dial pad, the sheet shows the gap and
 * «ثبت اصلاح» writes one «اصلاح موجودی» record for it. The balance itself is never typed over;
 * no earlier record changes.
 */
export default function FundReconcileSheet({
  account,
  saving,
  onSave,
  onClose
}: FundReconcileSheetProps) {
  const [real, setReal] = useState<number | ''>('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (account) {
      setReal(account.balance)
      setNote('')
    }
  }, [account])

  const correction = account
    ? fundCorrection(account, Number(real) || 0, note, getTodayIso())
    : null

  return (
    <FormModal
      open={account !== null}
      title={account ? `تطبیق موجودی ${account.title} با بانک` : ''}
      saveLabel="ثبت اصلاح"
      saving={saving}
      saveDisabled={!correction || real === ''}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        if (correction) onSave(Number(real), note)
      }}
    >
      {account ? (
        <>
          <p className="m-0 text-[0.82rem] leading-[1.7] text-muted">
            موجودی واقعی حساب را از اپ بانک یا دفتر نقدی ببین و اینجا وارد کن. اپ فقط اختلاف را ثبت
            می‌کند و هیچ‌چیز از قبل تغییر نمی‌کند.
          </p>
          <p className="m-0 flex items-center justify-between gap-2 text-[0.88rem] font-bold">
            <span>موجودی در اپ</span>
            <MoneyText amount={account.balance} />
          </p>
          <FormField label="موجودی واقعی بانک">
            <AmountField label="موجودی واقعی بانک" value={real} onChange={setReal} />
          </FormField>
          <div className={alertClassName(correction ? 'info' : 'success', 'mb-0')} role="status">
            {correction ? (
              <>
                <strong>
                  اختلاف: {correction.signedAmount > 0 ? '+' : '−'}
                  <MoneyText amount={Math.abs(correction.signedAmount)} />
                </strong>
                <p className="m-0">
                  اختلاف به‌صورت «اصلاح موجودی» ثبت می‌شود. این مبلغ جزو هزینه‌ها و وصول‌های گزارش
                  حساب نمی‌شود و در فهرست رکوردها می‌ماند.
                </p>
              </>
            ) : (
              <strong>موجودی با بانک یکی است ✓</strong>
            )}
          </div>
          <FormField label="یادداشت">
            <input
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="مثلاً کارمزد بانک"
              autoComplete="off"
            />
          </FormField>
        </>
      ) : null}
    </FormModal>
  )
}
