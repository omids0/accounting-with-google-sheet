import { useEffect, useState, type FormEvent } from 'react'

import type { RecurringChoice } from '../../services/recurring'
import type { RecurringItem } from '../../types'
import { normalizeDigits } from '../../utils/normalizeDigits'
import { showError } from '../../utils/toast'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import WalletAccountSelect from '../form/WalletAccountSelect'
import FormModal from '../FormModal'
import RecurringModeOptions from '../recurring/RecurringModeOptions'

/** «ویرایش تکرار»: title, amount, account, day of month and mode of one item. */
export default function RecurringFormModal({
  item,
  saving,
  onClose,
  onSave
}: {
  /** Open while set. */
  item: RecurringItem | null
  saving: boolean
  onClose: () => void
  onSave: (item: RecurringItem) => void
}) {
  const [draft, setDraft] = useState<RecurringItem | null>(item)
  const [day, setDay] = useState('')

  useEffect(() => {
    setDraft(item)
    setDay(item ? String(item.dayOfMonth) : '')
  }, [item])

  if (!draft) return null

  const set = (patch: Partial<RecurringItem>) => setDraft({ ...draft, ...patch })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const dayOfMonth = Number(normalizeDigits(day))

    if (!(draft.amount > 0)) return showError('مبلغ را وارد کنید')
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      return showError('روز ماه باید بین ۱ و ۳۱ باشد')
    }
    onSave({ ...draft, dayOfMonth })
  }

  return (
    <FormModal
      open={!!item}
      title="ویرایش تکرار"
      onClose={() => !saving && onClose()}
      onSubmit={onSubmit}
      saving={saving}
      saveLabel="ذخیره"
    >
      <FormField label="عنوان">
        <input
          type="text"
          value={draft.title}
          onChange={event => set({ title: event.target.value })}
        />
      </FormField>
      <FormField label="مبلغ" required>
        <AmountInput
          value={draft.amount}
          onChange={amount => set({ amount: Number(amount) || 0 })}
        />
      </FormField>
      <FormField label="حساب">
        <WalletAccountSelect value={draft.accountId} onChange={accountId => set({ accountId })} />
      </FormField>
      <FormField label="روز ماه" required hint="۲۹ تا ۳۱ در ماه‌های کوتاه‌تر، روز آخر ماه می‌شود">
        <input
          type="text"
          inputMode="numeric"
          value={day}
          onChange={event => setDay(event.target.value)}
        />
      </FormField>
      <RecurringModeOptions
        label="حالت"
        value={draft.active ? draft.mode : 'none'}
        onChange={(choice: RecurringChoice) =>
          set(choice === 'none' ? { active: false } : { mode: choice, active: true })
        }
      />
    </FormModal>
  )
}
