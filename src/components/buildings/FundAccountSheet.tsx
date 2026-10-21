import { useEffect, useState } from 'react'

import AmountField from '../AmountField'
import { FormField, FormSelect } from '../form'
import FormModal from '../FormModal'
import { ACCOUNT_TYPES, type FundAccountType } from './buildingOptions'
import { accountError, type FundAccountDraft } from './journeyDraft'
import Button from '../ui/Button'
import { formErrorClass, formHintClass } from '../ui/formStyles'
import WalletCardNumberInput from '../wallet/WalletCardNumberInput'

interface FundAccountSheetProps {
  open: boolean
  /** The account being edited; null for «+ حساب جدید». */
  account: FundAccountDraft | null
  /** Deleting is offered only while another account remains. */
  canDelete: boolean
  /**
   * The building exists: an account being edited changes its name and card only. Its type and
   * balance are fixed; the balance moves by records and by «تطبیق موجودی با بانک».
   */
  fixedBalance?: boolean
  onSave: (account: FundAccountDraft) => void
  onDelete: () => void
  onClose: () => void
}

const blank = (): FundAccountDraft => ({
  key: crypto.randomUUID(),
  title: '',
  type: 'bank',
  cardNumber: '',
  balance: 0
})

/**
 * A fund account of the building: name, type, the card (bank accounts only: bank SMS are routed
 * to the building by it) and the balance it starts with, typed on the dial pad.
 */
export default function FundAccountSheet({
  open,
  account,
  canDelete,
  fixedBalance = false,
  onSave,
  onDelete,
  onClose
}: FundAccountSheetProps) {
  const [draft, setDraft] = useState<FundAccountDraft>(blank)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDraft(account ?? blank())
      setError(null)
    }
  }, [open, account])

  const bank = draft.type === 'bank'

  const fixed = fixedBalance && account !== null

  return (
    <FormModal
      open={open}
      title={account ? 'ویرایش حساب' : 'حساب جدید'}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()

        const problem = accountError(draft)

        if (problem) setError(problem)
        else onSave({ ...draft, cardNumber: bank ? draft.cardNumber : '' })
      }}
      saveLabel={account ? 'ذخیره تغییرات' : 'افزودن حساب'}
    >
      <FormField label="نام حساب" required>
        <input
          value={draft.title}
          onChange={event => setDraft({ ...draft, title: event.target.value })}
          placeholder="مثلاً: ملت"
          autoComplete="off"
        />
      </FormField>
      {fixed ? null : (
        <FormSelect
          label="نوع حساب"
          value={draft.type}
          onChange={value => setDraft({ ...draft, type: value as FundAccountType })}
          options={ACCOUNT_TYPES}
        />
      )}
      {bank ? (
        <FormField
          label="شمارهٔ کارت (اختیاری)"
          hint="با کارت، پیامک‌های بانکیِ این حساب خودکار به ساختمان وصل می‌شود؛ بدونِ کارت، پیامک بانک را نمی‌شود تطبیق داد."
        >
          <WalletCardNumberInput
            value={draft.cardNumber}
            onChange={cardNumber => setDraft({ ...draft, cardNumber })}
          />
        </FormField>
      ) : null}
      {fixed ? (
        <p className={formHintClass}>
          برای تغییر موجودی از «تطبیق موجودی با بانک» استفاده کن تا تاریخچه حفظ شود.
        </p>
      ) : (
        <FormField label="موجودی فعلی">
          <AmountField
            label="موجودی فعلی"
            value={draft.balance}
            onChange={value => setDraft({ ...draft, balance: Number(value) || 0 })}
          />
        </FormField>
      )}
      {error ? (
        <p className={formErrorClass} role="alert">
          {error}
        </p>
      ) : null}
      {account && canDelete ? (
        <Button type="button" variant="danger" onClick={onDelete}>
          حذف حساب
        </Button>
      ) : null}
    </FormModal>
  )
}
