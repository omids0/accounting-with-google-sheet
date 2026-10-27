import { useEffect, useState } from 'react'

import {
  transferOverdraftHint,
  validateTransferDraft,
  type TransferDraft,
  type TransferErrors
} from './transferForm'
import type { WalletAccount } from '../../../types'
import { cn } from '../../../utils/cn'
import { getTodayIso } from '../../../utils/jalaliDate'
import AmountInput from '../../AmountInput'
import { FormField } from '../../form'
import WalletAccountSelect from '../../form/WalletAccountSelect'
import FormModal from '../../FormModal'
import JalaliDatePicker from '../../JalaliDatePicker'
import { formHintClass } from '../../ui/formStyles'

const emptyDraft = (fromAccountId: string): TransferDraft => ({
  fromAccountId,
  toAccountId: '',
  amount: '',
  date: getTodayIso(),
  note: ''
})

/**
 * «انتقال بین حساب‌ها»: from account, to account, amount, date, note. It is neither income nor
 * expense; only the two balances move. Closes only after a successful save (the caller closes it).
 */
export default function TransferFormModal({
  open,
  initialFromId,
  accounts,
  saving,
  onClose,
  onSubmit
}: {
  open: boolean
  /** The account «از حساب» starts on; '' leaves it empty. */
  initialFromId: string
  accounts: WalletAccount[]
  saving: boolean
  onClose: () => void
  onSubmit: (draft: TransferDraft) => void | Promise<unknown>
}) {
  const [draft, setDraft] = useState<TransferDraft>(() => emptyDraft(initialFromId))
  const [errors, setErrors] = useState<TransferErrors>({})

  // Every opening starts clean, with «از حساب» on the account it was opened from.
  useEffect(() => {
    if (!open) return
    setDraft(emptyDraft(initialFromId))
    setErrors({})
  }, [open, initialFromId])

  /** Edits one field and takes its own message away (a new «از حساب» also clears the «به» one). */
  const change = (patch: Partial<TransferDraft>, field?: keyof TransferErrors) => {
    setDraft(current => ({ ...current, ...patch }))
    if (field) {
      setErrors(current => ({
        ...current,
        [field]: undefined,
        ...(field === 'from' && { to: undefined })
      }))
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const found = validateTransferDraft(draft)

    setErrors(found)
    if (Object.keys(found).length) return

    return onSubmit(draft)
  }

  const overdraft = transferOverdraftHint(draft, accounts)

  return (
    <FormModal
      open={open}
      title="انتقال بین حساب‌ها"
      onClose={() => !saving && onClose()}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel="ثبت انتقال"
    >
      <FormField label="از حساب" required error={errors.from}>
        <WalletAccountSelect
          value={draft.fromAccountId}
          onChange={fromAccountId => change({ fromAccountId }, 'from')}
          accounts={accounts}
          allowNone={false}
          excludeId={draft.toAccountId}
          aria-label="از حساب"
        />
      </FormField>
      <FormField label="به حساب" required error={errors.to}>
        <WalletAccountSelect
          value={draft.toAccountId}
          onChange={toAccountId => change({ toAccountId }, 'to')}
          accounts={accounts}
          allowNone={false}
          excludeId={draft.fromAccountId}
          aria-label="به حساب"
        />
      </FormField>
      <FormField label="مبلغ" required error={errors.amount}>
        <AmountInput value={draft.amount} onChange={amount => change({ amount }, 'amount')} />
      </FormField>
      {overdraft ? (
        <p className={cn(formHintClass, 'text-[var(--color-warning)]')} role="status">
          {overdraft}
        </p>
      ) : null}
      <FormField label="تاریخ" error={errors.date}>
        <JalaliDatePicker value={draft.date} onChange={date => change({ date }, 'date')} />
      </FormField>
      <FormField label="یادداشت">
        <textarea
          rows={2}
          value={draft.note}
          maxLength={200}
          onChange={event => change({ note: event.target.value })}
          placeholder="اختیاری"
        />
      </FormField>
    </FormModal>
  )
}
