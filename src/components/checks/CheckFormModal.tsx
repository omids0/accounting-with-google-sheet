import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import type { CounterpartyWithRow } from '../counterparties/types'
import { CounterpartySelect, FormField, FormRow } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { CheckFormState, CheckWithRow } from './types'

export type CheckFormModalProps = {
  open: boolean
  editingItem: CheckWithRow | null
  saving: boolean
  counterparties: CounterpartyWithRow[]
  onClose: () => void
  onSubmit: (values: CheckFormState) => void | Promise<void>
  onCounterpartiesChange: (counterparties: CounterpartyWithRow[]) => void
}

export default function CheckFormModal({
  open,
  editingItem,
  saving,
  counterparties,
  onClose,
  onSubmit,
  onCounterpartiesChange
}: CheckFormModalProps) {
  const initialValues = useMemo<CheckFormState>(
    () =>
      editingItem
        ? {
            checkNumber: editingItem.checkNumber,
            counterparty: editingItem.counterparty,
            amount: editingItem.amount,
            creationDate: editingItem.creationDate,
            dueDate: editingItem.dueDate
          }
        : {
            checkNumber: '',
            counterparty: '',
            amount: '',
            creationDate: getTodayIso(),
            dueDate: getTodayIso()
          },
    [editingItem]
  )

  const { register, handleSubmit, reset, setValue, watch } = useForm<CheckFormState>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(values => onSubmit(values))(event)
  }

  const counterparty = watch('counterparty')

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش چک' : 'ثبت چک جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره چک'}
    >
      <FormRow>
        <FormField label="شماره چک" required>
          <input type="text" {...register('checkNumber')} placeholder="شماره چک" dir="ltr" />
        </FormField>

        <FormField label="مبلغ" required>
          <AmountInput value={watch('amount')} onChange={val => setValue('amount', val)} />
        </FormField>
      </FormRow>

      <FormField label="طرف حساب" required controlWidth="full">
        <CounterpartySelect
          value={counterparty}
          onChange={value => setValue('counterparty', value)}
          counterparties={counterparties}
          onCounterpartiesChange={onCounterpartiesChange}
          aria-label="طرف حساب چک"
        />
      </FormField>

      <FormRow>
        <FormField label="تاریخ صدور" required>
          <JalaliDatePicker
            value={watch('creationDate')}
            onChange={date => setValue('creationDate', date)}
          />
        </FormField>

        <FormField label="تاریخ سررسید" required>
          <JalaliDatePicker value={watch('dueDate')} onChange={date => setValue('dueDate', date)} />
        </FormField>
      </FormRow>
    </FormModal>
  )
}
